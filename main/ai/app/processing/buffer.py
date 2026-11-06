"""単一Workerが所有する有限Buffer。欠落を補間せず、連続Windowを返す。"""

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime

from app.domain.sensor import InvalidSensorBatch, SensorBatch, SensorSample

# ローカル検証用の時系列方針。実機での許容値合意は別途必要。
MAX_BATCH_AGE_SECONDS = 2.0
FUTURE_TOLERANCE_SECONDS = 1.0
OFFLINE_SECONDS = 5.0
MAX_DEVICES = 128
MIN_INTERVAL = 0.010
MAX_INTERVAL = 0.030
MIN_WINDOW_SPAN = 1.880
MAX_WINDOW_SPAN = 2.080


@dataclass(frozen=True, slots=True)
class Window:
    device_code: str
    started_at: datetime
    ended_at: datetime
    generation: int
    values: tuple[tuple[float, ...], ...]


@dataclass
class DeviceBuffer:
    samples: deque[SensorSample] = field(default_factory=lambda: deque(maxlen=100))
    count: int = 0
    next_emit: int = 100
    last_received: float = 0.0
    generation: int = 0


class BufferManager:
    def __init__(self, step: int) -> None:
        if not 1 <= step <= 100:
            raise ValueError("window_step")
        self.step = step
        self.devices: dict[str, DeviceBuffer] = {}

    def reset(self, code: str | None) -> None:
        if code is None:
            self.devices.clear()
        else:
            self.devices.pop(code, None)

    def expire(self, now_mono: float) -> None:
        for code, state in list(self.devices.items()):
            if now_mono - state.last_received >= OFFLINE_SECONDS:
                self.reset(code)

    @staticmethod
    def check_batch(batch: SensorBatch, now: datetime) -> None:
        if not batch.samples:
            raise InvalidSensorBatch("empty_batch")
        end = batch.samples[-1].measured_at
        age = (now - end).total_seconds()
        if age > MAX_BATCH_AGE_SECONDS or age < -FUTURE_TOLERANCE_SECONDS:
            raise InvalidSensorBatch("batch_freshness")
        # 100点バッチの先頭は元々約2秒前。末尾の鮮度と区間長を別々に検査。
        span = (end - batch.samples[0].measured_at).total_seconds()
        if span < 0 or span > MAX_WINDOW_SPAN:
            raise InvalidSensorBatch("batch_span")

    def append(
        self, batch: SensorBatch, *, now: datetime, now_mono: float
    ) -> list[Window]:
        self.expire(now_mono)
        try:
            self.check_batch(batch, batch.received_at)
            self.check_batch(batch, now)
        except InvalidSensorBatch:
            self.reset(batch.device_code)
            raise
        code = batch.device_code
        state = self.devices.get(code)
        if state is not None and state.generation != batch.generation:
            self.reset(code)
            state = None
        if state is None:
            if len(self.devices) >= MAX_DEVICES:
                raise InvalidSensorBatch("buffer_capacity")
            state = DeviceBuffer(generation=batch.generation)
            self.devices[code] = state
        windows = []
        for sample in batch.samples:
            if state.samples:
                delta = (
                    sample.measured_at - state.samples[-1].measured_at
                ).total_seconds()
                if delta == 0:
                    continue
                if delta < 0:
                    self.reset(code)
                    raise InvalidSensorBatch("sample_reversed")
                if not MIN_INTERVAL <= delta <= MAX_INTERVAL:
                    state = DeviceBuffer(generation=batch.generation)
                    self.devices[code] = state
                    # このバッチ内で既に生成したWindowも欠落を跨いで送らない。
                    windows.clear()
            state.samples.append(sample)
            state.count += 1
            state.last_received = now_mono
            if state.count != state.next_emit:
                continue
            span = (
                state.samples[-1].measured_at - state.samples[0].measured_at
            ).total_seconds()
            if not MIN_WINDOW_SPAN <= span <= MAX_WINDOW_SPAN:
                self.reset(code)
                raise InvalidSensorBatch("window_span")
            windows.append(
                Window(
                    code,
                    state.samples[0].measured_at,
                    state.samples[-1].measured_at,
                    batch.generation,
                    tuple(s.accelerometer + s.gyroscope for s in state.samples),
                )
            )
            state.next_emit += self.step
        return windows

    def is_current(self, window: Window, *, now: datetime, now_mono: float) -> bool:
        state = self.devices.get(window.device_code)
        age = (now - window.ended_at).total_seconds()
        return (
            state is not None
            and state.generation == window.generation
            and now_mono - state.last_received < OFFLINE_SECONDS
            and -FUTURE_TOLERANCE_SECONDS <= age <= MAX_BATCH_AGE_SECONDS
        )
