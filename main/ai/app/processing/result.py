"""結果生成と有限のQoS 1送達管理。DB・Alertは扱わない。"""

import json
import logging
import math
from dataclasses import dataclass
from datetime import UTC
from uuid import uuid4

import paho.mqtt.client as mqtt

from app.processing.buffer import Window
from app.processing.inference import Prediction

logger = logging.getLogger(__name__)
MAX_PENDING = 100
ACK_TIMEOUT = 5.0


def make_result(window: Window, prediction: Prediction) -> dict[str, str]:
    if (
        not math.isfinite(prediction.p_fall)
        or not 0 <= prediction.p_fall <= 1
        or prediction.result != ("fall" if prediction.p_fall >= 0.5 else "normal")
        or not prediction.model_version
    ):
        raise ValueError("prediction_invalid")
    return {
        "device_code": window.device_code,
        "result": prediction.result,
        "detected_at": window.ended_at.astimezone(UTC)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z"),
        "model_version": prediction.model_version,
        "event_id": str(uuid4()),
    }


@dataclass
class PendingResult:
    info: mqtt.MQTTMessageInfo
    event_id: str
    started_at: float
    timed_out: bool = False


class ResultPublisher:
    """Workerがstate_lock内で操作。ACK待ちは行わず、完了をpollする。"""

    def __init__(self, client) -> None:
        self.client = client
        self.pending: list[PendingResult] = []
        self.accepted = 0
        self.acked = 0
        self.failed = 0
        self.unknown = 0

    def publish(self, result: dict[str, str], *, now: float) -> bool:
        self.poll(now=now)
        if len(self.pending) >= MAX_PENDING:
            self.failed += 1
            logger.warning("RESULT_PUBLISH_FAILED reason=queue_full")
            return False
        try:
            info = self.client.publish(
                f"fall/{result['device_code']}/events",
                json.dumps(result, separators=(",", ":"), allow_nan=False),
                qos=1,
                retain=False,
            )
        except Exception:
            self.failed += 1
            logger.error("RESULT_PUBLISH_FAILED reason=client_error")
            return False
        if info.rc != mqtt.MQTT_ERR_SUCCESS:
            # NO_CONNでもPahoがQoS1を内部保持する場合がある。再Publishしない。
            if info.rc == mqtt.MQTT_ERR_NO_CONN:
                self.unknown += 1
                # このinfoはis_published()がRuntimeErrorになるためACK追跡不可。
                # Paho内の有限Queueに残る可能性があり、未送達とは断定しない。
                logger.warning("RESULT_DELIVERY_UNKNOWN reason=disconnected")
            else:
                self.failed += 1
                logger.warning("RESULT_PUBLISH_FAILED reason=client_rejected")
            return False
        self.accepted += 1
        self.pending.append(PendingResult(info, result["event_id"], now))
        return True

    def poll(self, *, now: float) -> None:
        remaining = []
        for item in self.pending:
            if item.info.is_published():
                self.acked += 1
                logger.info("RESULT_ACKED event_id=%s", item.event_id)
                continue
            if not item.timed_out and now - item.started_at >= ACK_TIMEOUT:
                item.timed_out = True
                self.unknown += 1
                logger.warning("RESULT_DELIVERY_UNKNOWN event_id=%s", item.event_id)
            # timeout後も完了まで保持。上限を迂回して未ACK状態を増やさない。
            remaining.append(item)
        self.pending = remaining

    def snapshot(self) -> dict[str, int]:
        return {
            "accepted": self.accepted,
            "acked": self.acked,
            "failed": self.failed,
            "delivery_unknown": self.unknown,
            "pending": len(self.pending),
        }
