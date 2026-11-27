"""単一Workerが所有するデバイス別の連続時系列Buffer。"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from math import isfinite

import numpy as np

from app.domain.sensor import SensorSample

FEATURE_COUNT = 6
WINDOW_SIZE = 100
MAX_DEVICES = 128
FLOAT32_MAX = float(np.finfo(np.float32).max)


class BufferCapacityError(RuntimeError):
    """新規デバイスを保持できる上限に達した。"""


@dataclass(frozen=True, slots=True)
class SensorWindow:
    device_code: str
    started_at: datetime
    ended_at: datetime
    values: np.ndarray
    generation: int


@dataclass(slots=True)
class _DeviceBuffer:
    samples: deque[SensorSample]
    generation: int
    accepted_count: int
    next_emit: int
    last_measured_at: datetime | None
    last_seen_monotonic: float


class BufferManager:
    """100点WindowをStep境界で1回だけ生成する。

    MQTT callbackからは呼ばず、InputPipelineの単一Workerだけが更新する。時刻境界
    の外部契約は未合意のため、gap/stale/future上限は明示設定された場合だけ適用する。
    """

    def __init__(
        self,
        *,
        step: int = 50,
        max_devices: int = MAX_DEVICES,
        offline_after_seconds: float | None = None,
        max_gap_seconds: float | None = None,
        min_gap_seconds: float | None = None,
        max_sample_age_seconds: float | None = None,
        max_future_skew_seconds: float | None = None,
    ) -> None:
        if not 1 <= step <= WINDOW_SIZE:
            raise ValueError("step")
        if not 1 <= max_devices <= MAX_DEVICES:
            raise ValueError("max_devices")
        for name, value in (
            ("offline_after_seconds", offline_after_seconds),
            ("max_gap_seconds", max_gap_seconds),
            ("min_gap_seconds", min_gap_seconds),
            ("max_sample_age_seconds", max_sample_age_seconds),
            ("max_future_skew_seconds", max_future_skew_seconds),
        ):
            if value is not None and (not isfinite(value) or value <= 0):
                raise ValueError(name)
        if (
            min_gap_seconds is not None
            and max_gap_seconds is not None
            and min_gap_seconds > max_gap_seconds
        ):
            raise ValueError("min_gap_seconds")
        self.step = step
        self.max_devices = max_devices
        self.offline_after_seconds = offline_after_seconds
        self.max_gap_seconds = max_gap_seconds
        self.min_gap_seconds = min_gap_seconds
        self.max_sample_age_seconds = max_sample_age_seconds
        self.max_future_skew_seconds = max_future_skew_seconds
        self._buffers: dict[str, _DeviceBuffer] = {}

    def __len__(self) -> int:
        return len(self._buffers)

    def append(
        self,
        sample: SensorSample,
        *,
        generation: int,
        now_monotonic: float,
        now_utc: datetime | None = None,
    ) -> SensorWindow | None:
        """追加し、100点/Step境界だけでimmutable Windowを返す。"""
        self._validate(sample, now_monotonic)
        now_utc = self._normalize_now_utc(now_utc)

        if self._is_stale(sample, now_utc) or self._is_future(sample, now_utc):
            self.reset(sample.device_code, reason="time_bound")
            return None

        state = self._buffers.get(sample.device_code)
        if state is None:
            if len(self._buffers) >= self.max_devices:
                raise BufferCapacityError("buffer_capacity")
            state = self._new(generation, now_monotonic)
            self._buffers[sample.device_code] = state
        elif state.generation != generation:
            self._reset_state(state, generation, now_monotonic)

        previous = state.last_measured_at
        if previous is not None:
            if sample.measured_at == previous:
                return None
            if sample.measured_at < previous:
                self._reset_state(state, generation, now_monotonic)
                return None
            if self._has_interval_discontinuity(sample.measured_at - previous):
                self._reset_state(state, generation, now_monotonic)

        state.samples.append(sample)
        state.last_measured_at = sample.measured_at
        state.last_seen_monotonic = now_monotonic
        state.accepted_count += 1
        if state.accepted_count != state.next_emit:
            return None
        window = self._window(sample.device_code, state)
        state.next_emit += self.step
        return window

    def reset(self, device_code: str, *, reason: str) -> bool:
        """対象デバイスの連続区間を削除する。reasonは呼出側のログ用。"""
        del reason
        return self._buffers.pop(device_code, None) is not None

    def reset_all(self, *, reason: str) -> int:
        """切断・Queue欠落時に全ての連続区間を無効化する。"""
        del reason
        count = len(self._buffers)
        self._buffers.clear()
        return count

    def expire(self, *, now_monotonic: float) -> tuple[str, ...]:
        """OFFLINE期限を超えた端末を削除する。"""
        if not isfinite(now_monotonic):
            raise ValueError("now_monotonic")
        if self.offline_after_seconds is None:
            return ()
        expired = tuple(
            code
            for code, state in self._buffers.items()
            if now_monotonic - state.last_seen_monotonic >= self.offline_after_seconds
        )
        for code in expired:
            del self._buffers[code]
        return expired

    def _new(self, generation: int, now_monotonic: float) -> _DeviceBuffer:
        return _DeviceBuffer(
            deque(maxlen=WINDOW_SIZE), generation, 0, WINDOW_SIZE, None, now_monotonic
        )

    @staticmethod
    def _reset_state(
        state: _DeviceBuffer, generation: int, now_monotonic: float
    ) -> None:
        state.samples.clear()
        state.generation = generation
        state.accepted_count = 0
        state.next_emit = WINDOW_SIZE
        state.last_measured_at = None
        state.last_seen_monotonic = now_monotonic

    @staticmethod
    def _normalize_now_utc(now_utc: datetime | None) -> datetime | None:
        if now_utc is None:
            return None
        if now_utc.tzinfo is None or now_utc.utcoffset() is None:
            raise ValueError("now_utc")
        return now_utc.astimezone(UTC)

    def _is_stale(self, sample: SensorSample, now_utc: datetime | None) -> bool:
        if self.max_sample_age_seconds is None or now_utc is None:
            return False
        age = (now_utc - sample.measured_at).total_seconds()
        return age > self.max_sample_age_seconds

    def _is_future(self, sample: SensorSample, now_utc: datetime | None) -> bool:
        if self.max_future_skew_seconds is None or now_utc is None:
            return False
        skew = (sample.measured_at - now_utc).total_seconds()
        return skew > self.max_future_skew_seconds

    def _has_interval_discontinuity(self, interval: timedelta) -> bool:
        seconds = interval.total_seconds()
        if self.min_gap_seconds is not None and seconds < self.min_gap_seconds:
            return True
        return self.max_gap_seconds is not None and seconds > self.max_gap_seconds

    @staticmethod
    def _validate(sample: SensorSample, now_monotonic: float) -> None:
        values = (*sample.accelerometer, *sample.gyroscope)
        if (
            not sample.device_code
            or sample.measured_at.tzinfo is None
            or sample.measured_at.utcoffset() is None
            or not isfinite(now_monotonic)
        ):
            raise ValueError("sample")
        if len(values) != FEATURE_COUNT or not all(
            type(value) in (int, float)
            and abs(value) <= FLOAT32_MAX
            and isfinite(value)
            for value in values
        ):
            raise ValueError("sample_values")

    @staticmethod
    def _window(device_code: str, state: _DeviceBuffer) -> SensorWindow:
        if len(state.samples) != WINDOW_SIZE:
            raise RuntimeError("window_size_invariant")
        values = np.asarray(
            [(*sample.accelerometer, *sample.gyroscope) for sample in state.samples],
            dtype=np.float32,
        )
        if (
            values.shape != (WINDOW_SIZE, FEATURE_COUNT)
            or not np.isfinite(values).all()
        ):
            raise RuntimeError("window_values_invariant")
        values.setflags(write=False)
        return SensorWindow(
            device_code,
            state.samples[0].measured_at,
            state.samples[-1].measured_at,
            values,
            state.generation,
        )
