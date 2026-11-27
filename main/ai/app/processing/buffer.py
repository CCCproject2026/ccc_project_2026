"""単一Workerが所有する、デバイス別の連続時系列BufferとWindow生成。

このモジュールは検証済みかつACTIVEな ``SensorSample`` の連続区間だけをRAMに保持し、
Step境界で不変な ``(100, 6)`` Windowを1回だけ生成する。MQTT/Pipelineとの接続と
推論はAI-15以降の責務である。
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from math import isfinite

import numpy as np

from app.domain.sensor import SensorSample

WINDOW_SIZE = 100
MAX_DEVICES = 128
FLOAT32_MAX = float(np.finfo(np.float32).max)


class BufferCapacityError(RuntimeError):
    """新規デバイスのBufferを作成できない。"""


class AppendOutcome(StrEnum):
    """入力1点の受理結果。呼出側は安全な理由コードとしてだけ利用する。"""

    ACCEPTED = "accepted"
    DUPLICATE = "duplicate"
    OUT_OF_ORDER = "out_of_order"
    DISCONTINUITY = "discontinuity"
    STALE = "stale"
    FUTURE = "future"


@dataclass(frozen=True, slots=True)
class ContinuityPolicy:
    """担当者が合意した時刻境界を渡す。

    数値は呼出側が明示して渡す。この層は未合意の値を推測せず、境界がないまま
    連続性検査を無効化することも許可しない。
    """

    min_interval: timedelta
    max_interval: timedelta
    max_sample_age: timedelta
    max_future_skew: timedelta
    offline_after: timedelta

    def __post_init__(self) -> None:
        for value in (
            self.min_interval,
            self.max_interval,
            self.max_sample_age,
            self.max_future_skew,
            self.offline_after,
        ):
            if value <= timedelta(0):
                raise ValueError("continuity_policy")
        if self.min_interval > self.max_interval:
            raise ValueError("continuity_policy")


@dataclass(frozen=True, slots=True)
class SensorWindow:
    """前処理へ渡す、デバイス単位で不変な100点Window。"""

    device_code: str
    started_at: datetime
    ended_at: datetime
    values: np.ndarray
    generation: int


@dataclass(frozen=True, slots=True)
class AppendResult:
    """1点の受理結果と、その点で完成したWindow。"""

    outcome: AppendOutcome
    window: SensorWindow | None = None


@dataclass(slots=True)
class _DeviceBuffer:
    samples: deque[SensorSample]
    generation: int
    accepted_count: int
    next_emit: int
    last_measured_at: datetime | None
    last_active_monotonic: float


class BufferManager:
    """最大128デバイスの連続サンプルを保持し、Step境界でWindowを返す。

    MQTT callbackから呼ばない。呼出しは単一Pipeline Workerに限定するため、このクラスは
    lockを持たない。Bufferの各dequeは最大100点で、reset後のサンプルだけを保持する。
    同じ点でWindowを再生成せず、推論側の失敗で点数を巻き戻さない。
    """

    def __init__(
        self,
        *,
        policy: ContinuityPolicy,
        window_step: int,
        max_devices: int = MAX_DEVICES,
    ) -> None:
        if not 1 <= max_devices <= MAX_DEVICES:
            raise ValueError("max_devices")
        if window_step not in (50, WINDOW_SIZE):
            raise ValueError("window_step")
        self.policy = policy
        self.window_step = window_step
        self.max_devices = max_devices
        self._buffers: dict[str, _DeviceBuffer] = {}

    def __len__(self) -> int:
        return len(self._buffers)

    def append(
        self,
        sample: SensorSample,
        *,
        generation: int,
        now_monotonic: float,
        now_utc: datetime,
    ) -> AppendResult:
        """連続性を満たす1点だけを保持する。

        重複と逆行は点数を増やさない。逆行・時刻境界違反では既存区間を削除し、現在の点も
        採用しない。間隔異常では既存区間を削除した後、現在の点を新しい区間の先頭にする。
        """
        self._validate_sample(sample, now_monotonic)
        now_utc = self._validate_now_utc(now_utc)

        state = self._buffers.get(sample.device_code)
        if self._is_stale(sample, now_utc):
            self.reset(sample.device_code, reason="stale")
            return AppendResult(AppendOutcome.STALE)
        if self._is_future(sample, now_utc):
            self.reset(sample.device_code, reason="future")
            return AppendResult(AppendOutcome.FUTURE)

        if state is None:
            state = self._create(sample.device_code, generation, now_monotonic)
        elif state.generation != generation:
            self._reset_state(state, generation, now_monotonic)

        previous = state.last_measured_at
        if previous is not None:
            if sample.measured_at == previous:
                return AppendResult(AppendOutcome.DUPLICATE)
            if sample.measured_at < previous:
                self.reset(sample.device_code, reason="out_of_order")
                return AppendResult(AppendOutcome.OUT_OF_ORDER)
            if self._has_interval_discontinuity(sample.measured_at - previous):
                self._reset_state(state, generation, now_monotonic)
                outcome = AppendOutcome.DISCONTINUITY
            else:
                outcome = AppendOutcome.ACCEPTED
        else:
            outcome = AppendOutcome.ACCEPTED

        state.samples.append(sample)
        state.last_measured_at = sample.measured_at
        state.last_active_monotonic = now_monotonic
        state.accepted_count += 1
        return AppendResult(outcome, self._next_window(sample.device_code, state))

    def _next_window(
        self, device_code: str, state: _DeviceBuffer
    ) -> SensorWindow | None:
        """現在のappendで到達したStep境界のWindowを1回だけ生成する。"""
        if state.accepted_count < state.next_emit:
            return None
        if state.accepted_count != state.next_emit or len(state.samples) != WINDOW_SIZE:
            raise RuntimeError("window_count_invariant")
        with np.errstate(over="ignore", invalid="ignore"):
            values = np.asarray(
                [
                    (*sample.accelerometer, *sample.gyroscope)
                    for sample in state.samples
                ],
                dtype=np.float32,
            )
        if values.shape != (WINDOW_SIZE, 6) or not np.isfinite(values).all():
            raise RuntimeError("window_values_invariant")
        values.setflags(write=False)
        window = SensorWindow(
            device_code=device_code,
            started_at=state.samples[0].measured_at,
            ended_at=state.samples[-1].measured_at,
            values=values,
            generation=state.generation,
        )
        state.next_emit += self.window_step
        return window

    def reset(self, device_code: str, *, reason: str) -> bool:
        """指定デバイスの連続区間を破棄する。reasonは呼出側の安全なログ用。"""
        del reason
        return self._buffers.pop(device_code, None) is not None

    def reset_all(self, *, reason: str) -> int:
        """切断・Queue欠落などで全デバイスの連続区間を破棄する。"""
        del reason
        count = len(self._buffers)
        self._buffers.clear()
        return count

    def expire(self, *, now_monotonic: float) -> tuple[str, ...]:
        """OFFLINE期限を超えたデバイスを削除する。"""
        if not isfinite(now_monotonic):
            raise ValueError("now_monotonic")
        expired = tuple(
            code
            for code, state in self._buffers.items()
            if now_monotonic - state.last_active_monotonic
            >= self.policy.offline_after.total_seconds()
        )
        for code in expired:
            del self._buffers[code]
        return expired

    def _create(
        self, device_code: str, generation: int, now_monotonic: float
    ) -> _DeviceBuffer:
        if len(self._buffers) >= self.max_devices:
            raise BufferCapacityError("buffer_capacity")
        state = _DeviceBuffer(
            samples=deque(maxlen=WINDOW_SIZE),
            generation=generation,
            accepted_count=0,
            next_emit=WINDOW_SIZE,
            last_measured_at=None,
            last_active_monotonic=now_monotonic,
        )
        self._buffers[device_code] = state
        return state

    @staticmethod
    def _reset_state(
        state: _DeviceBuffer, generation: int, now_monotonic: float
    ) -> None:
        state.samples.clear()
        state.generation = generation
        state.accepted_count = 0
        state.next_emit = WINDOW_SIZE
        state.last_measured_at = None
        state.last_active_monotonic = now_monotonic

    def _validate_now_utc(self, now_utc: datetime) -> datetime:
        if now_utc.tzinfo is None or now_utc.utcoffset() is None:
            raise ValueError("now_utc")
        return now_utc.astimezone(UTC)

    def _is_stale(self, sample: SensorSample, now_utc: datetime) -> bool:
        return sample.measured_at < now_utc - self.policy.max_sample_age

    def _is_future(self, sample: SensorSample, now_utc: datetime) -> bool:
        return sample.measured_at > now_utc + self.policy.max_future_skew

    def _has_interval_discontinuity(self, interval: timedelta) -> bool:
        return (
            interval < self.policy.min_interval or interval > self.policy.max_interval
        )

    @staticmethod
    def _validate_sample(sample: SensorSample, now_monotonic: float) -> None:
        values = (*sample.accelerometer, *sample.gyroscope)
        if (
            not sample.device_code
            or sample.measured_at.tzinfo is None
            or sample.measured_at.utcoffset() is None
            or not isfinite(now_monotonic)
        ):
            raise ValueError("sample")
        if len(values) != 6 or not all(
            type(value) in (int, float)
            and abs(value) <= FLOAT32_MAX
            and isfinite(value)
            for value in values
        ):
            raise ValueError("sample_values")
