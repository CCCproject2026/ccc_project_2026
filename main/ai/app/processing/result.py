"""推論結果の生成と送信状態管理。

AIは判定結果JSONを生成してMQTTへpublishする。Web受信・Alert管理・DB保存は担当しない。
送達はBroker ACKまでを追跡し、Web到達は保証しない。
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from math import isfinite
from threading import Lock
from time import monotonic

from app.processing.buffer import SensorWindow
from app.processing.inference import Prediction

logger = logging.getLogger(__name__)


class ResultDeliveryError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class ResultMessage:
    event_id: str
    device_code: str
    result: str
    model_version: str
    detected_at: datetime
    generation: int

    @property
    def topic_suffix(self) -> str:
        return self.device_code

    def payload(self) -> bytes:
        return json.dumps(
            {
                "event_id": self.event_id,
                "device_code": self.device_code,
                "result": self.result,
                "detected_at": self.detected_at.astimezone(UTC)
                .isoformat(timespec="milliseconds")
                .replace("+00:00", "Z"),
                "model_version": self.model_version,
            },
            separators=(",", ":"),
            ensure_ascii=True,
        ).encode("utf-8")


@dataclass(slots=True)
class DeliveryRecord:
    message: ResultMessage
    state: str
    info: object | None = None
    enqueued_at: float = 0.0
    accepted_at: float | None = None
    acked_at: float | None = None
    error: str | None = None


class ResultPublisher:
    def __init__(
        self,
        publish,
        *,
        topic_template: str,
        qos: int,
        capacity: int,
        inflight: int,
        ack_timeout_seconds: float,
    ) -> None:
        if "{device_code}" not in topic_template:
            raise ValueError("topic_template")
        if qos not in (0, 1):
            raise ValueError("qos")
        if capacity <= 0 or inflight <= 0 or inflight > capacity:
            raise ValueError("capacity_or_inflight")
        if not isfinite(ack_timeout_seconds) or ack_timeout_seconds <= 0:
            raise ValueError("ack_timeout_seconds")
        self._publish = publish
        self.topic_template = topic_template
        self.qos = qos
        self.capacity = capacity
        self.inflight = inflight
        self.ack_timeout_seconds = ack_timeout_seconds
        self._lock = Lock()
        self._pending: dict[str, DeliveryRecord] = {}
        self._counts = {
            "created": 0,
            "accepted": 0,
            "acked": 0,
            "failed": 0,
            "delivery_unknown": 0,
            "dropped": 0,
        }

    @staticmethod
    def build_message(window: SensorWindow, prediction: Prediction) -> ResultMessage:
        detected_at = window.ended_at.astimezone(UTC)
        return ResultMessage(
            event_id=str(uuid.uuid4()),
            device_code=window.device_code,
            result=prediction.result,
            model_version=prediction.model_version,
            detected_at=detected_at,
            generation=window.generation,
        )

    def publish(self, message: ResultMessage) -> str:
        with self._lock:
            self._sweep_locked(monotonic())
            if len(self._pending) >= self.capacity:
                self._counts["dropped"] += 1
                raise ResultDeliveryError("publish_queue_full")
            record = DeliveryRecord(
                message=message, state="CREATED", enqueued_at=monotonic()
            )
            self._pending[message.event_id] = record
            self._counts["created"] += 1

        topic = self.topic_template.format(device_code=message.device_code)
        payload = message.payload()
        try:
            info = self._publish(topic, payload, qos=self.qos, retain=False)
        except Exception as error:
            self._mark_failed(message.event_id, f"publish_error:{type(error).__name__}")
            raise

        rc = getattr(info, "rc", 1)
        if rc != 0:
            self._mark_failed(message.event_id, f"publish_rc:{rc}")
            raise ResultDeliveryError("publish_not_accepted")

        now = monotonic()
        with self._lock:
            record = self._pending.get(message.event_id)
            if record is None:
                return "DROPPED"
            record.info = info
            record.accepted_at = now
            record.state = "ACCEPTED_BY_CLIENT"
            self._counts["accepted"] += 1
            self._refresh_locked(now)
            return record.state

    def on_publish_ack(self, mid: int | None = None) -> None:
        if mid is None:
            return
        now = monotonic()
        with self._lock:
            for record in self._pending.values():
                info = record.info
                if info is None or getattr(info, "mid", None) != mid:
                    continue
                if record.state != "ACCEPTED_BY_CLIENT":
                    return
                record.state = "ACKED"
                record.acked_at = now
                self._counts["acked"] += 1
                del self._pending[record.message.event_id]
                return

    def tick(self) -> None:
        with self._lock:
            self._refresh_locked(monotonic())

    def pending_count(self) -> int:
        with self._lock:
            self._sweep_locked(monotonic())
            return len(self._pending)

    def snapshot(self) -> dict:
        with self._lock:
            self._sweep_locked(monotonic())
            pending = list(self._pending.values())
            ack_latencies = [
                r.acked_at - r.accepted_at
                for r in pending
                if r.acked_at is not None and r.accepted_at is not None
            ]
            return {
                "pending": len(pending),
                "inflight": sum(1 for r in pending if r.state == "ACCEPTED_BY_CLIENT"),
                "counts": self._counts.copy(),
                "oldest_pending_age_seconds": max(
                    (monotonic() - r.enqueued_at for r in pending), default=0.0
                ),
                "ack_latency_max_seconds": max(ack_latencies, default=0.0),
            }

    def close(self, *, timeout: float) -> dict:
        deadline = monotonic() + max(0.0, timeout)
        while True:
            with self._lock:
                self._refresh_locked(monotonic())
                pending = [
                    r
                    for r in self._pending.values()
                    if r.state in {"CREATED", "ACCEPTED_BY_CLIENT"}
                ]
                if not pending or monotonic() >= deadline:
                    for record in pending:
                        record.state = "DELIVERY_UNKNOWN"
                        record.error = "shutdown_timeout"
                        self._counts["delivery_unknown"] += 1
                        logger.warning(
                            "RESULT_DELIVERY_UNKNOWN event_id=%s device_code=%s reason=shutdown_timeout",
                            record.message.event_id,
                            record.message.device_code,
                        )
                    self._pending.clear()
                    return self.snapshot()
            # 短いsleepでACK反映を待つ。publishスレッド自体はここでは止めない。
            remaining = deadline - monotonic()
            if remaining <= 0:
                continue
            # monotonic基準で待機し、busy loopを避ける。
            import time

            time.sleep(min(0.05, remaining))

    def _mark_failed(self, event_id: str, reason: str) -> None:
        with self._lock:
            record = self._pending.pop(event_id, None)
            if record is None:
                return
            record.state = "FAILED"
            record.error = reason
            self._counts["failed"] += 1
            logger.warning(
                "RESULT_PUBLISH_FAILED event_id=%s device_code=%s reason=%s",
                record.message.event_id,
                record.message.device_code,
                reason,
            )

    def _sweep_locked(self, now: float) -> None:
        expired = []
        for event_id, record in self._pending.items():
            if record.state == "ACCEPTED_BY_CLIENT" and record.accepted_at is not None:
                if now - record.accepted_at >= self.ack_timeout_seconds:
                    expired.append(event_id)
        for event_id in expired:
            record = self._pending.pop(event_id, None)
            if record is None:
                continue
            record.state = "DELIVERY_UNKNOWN"
            record.error = "ack_timeout"
            self._counts["delivery_unknown"] += 1
            logger.warning(
                "RESULT_DELIVERY_UNKNOWN event_id=%s device_code=%s reason=ack_timeout",
                record.message.event_id,
                record.message.device_code,
            )

    def _refresh_locked(self, now: float) -> None:
        self._sweep_locked(now)
        for record in self._pending.values():
            info = record.info
            if record.state != "ACCEPTED_BY_CLIENT" or info is None:
                continue
            if self.qos == 0:
                record.state = "ACKED"
                record.acked_at = now
                self._counts["acked"] += 1
            elif getattr(info, "is_published", lambda: False)():
                record.state = "ACKED"
                record.acked_at = now
                self._counts["acked"] += 1
        for event_id in [
            event_id
            for event_id, record in self._pending.items()
            if record.state == "ACKED"
        ]:
            del self._pending[event_id]
