"""入力ユースケース。通信ライブラリ・JSONに依存しない。"""

from collections.abc import Callable
from dataclasses import dataclass

from app.domain.sensor import InvalidSensorBatch, SensorBatch


@dataclass(frozen=True, slots=True)
class SensorInputService:
    consume: Callable[[SensorBatch], None]

    def accept(self, batch: SensorBatch, *, topic: str, retained: bool) -> None:
        if retained:
            raise InvalidSensorBatch("retained_sensor")
        if topic != f"fall/{batch.device_code}/data":
            raise InvalidSensorBatch("topic_device_mismatch")
        self.consume(batch)
