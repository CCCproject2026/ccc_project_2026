"""通信形式に依存しない入力データ。"""

from dataclasses import dataclass
from datetime import datetime


class InvalidSensorBatch(ValueError):
    """安全な理由コードのみを保持する入力エラー。"""


@dataclass(frozen=True, slots=True)
class SensorSample:
    device_code: str
    measured_at: datetime
    accelerometer: tuple[float, float, float]
    gyroscope: tuple[float, float, float]


@dataclass(frozen=True, slots=True)
class SensorBatch:
    device_code: str
    samples: tuple[SensorSample, ...]
    received_at: datetime
    generation: int
