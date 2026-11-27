"""構造化stdoutログと、運用ログMQTTへのbest-effort転送。"""

from __future__ import annotations

import json
import logging
import sys
from dataclasses import dataclass, field
from datetime import UTC, datetime
from threading import Lock
from time import monotonic
from uuid import uuid4

_SENSITIVE_KEYS = {
    "payload",
    "raw_payload",
    "body",
    "password",
    "token",
    "authorization",
    "secret",
    "mqtt_password",
    "device_api_token",
}


def _utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _sanitize(value):
    if isinstance(value, dict):
        sanitized = {}
        for key, item in value.items():
            if str(key).lower() in _SENSITIVE_KEYS:
                sanitized[key] = "[redacted]"
            else:
                sanitized[key] = _sanitize(item)
        return sanitized
    if isinstance(value, (list, tuple)):
        return [_sanitize(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


@dataclass(slots=True)
class _AggregateState:
    count: int = 0
    first_at: float = 0.0
    last_record: dict = field(default_factory=dict)


class _RunIdFilter(logging.Filter):
    def __init__(self, server_run_id: str) -> None:
        super().__init__()
        self.server_run_id = server_run_id

    def filter(self, record: logging.LogRecord) -> bool:
        record.server_run_id = self.server_run_id
        return True


class StructuredFormatter(logging.Formatter):
    def __init__(self, *, server_run_id: str) -> None:
        super().__init__()
        self.server_run_id = server_run_id

    def format(self, record: logging.LogRecord) -> str:
        event = getattr(record, "event", record.name)
        data = {
            "logged_at": _utc_now(),
            "level": record.levelname,
            "event": event,
            "server_run_id": getattr(record, "server_run_id", self.server_run_id),
            "message": record.getMessage(),
        }
        for key in (
            "device_code",
            "model_version",
            "window_end",
            "duration_ms",
            "error_code",
            "count",
            "event_id",
            "reason",
            "state",
            "topic",
        ):
            value = getattr(record, key, None)
            if value is not None:
                data[key] = _sanitize(value)
        extra = getattr(record, "structured", None)
        if isinstance(extra, dict):
            for key, value in extra.items():
                if str(key).lower() in _SENSITIVE_KEYS:
                    data[key] = "[redacted]"
                else:
                    data[key] = _sanitize(value)
        if record.exc_info:
            data["exception_type"] = record.exc_info[0].__name__
        return json.dumps(data, ensure_ascii=True, separators=(",", ":"))


class OperationLogPublisher:
    def __init__(
        self,
        publish,
        *,
        topic: str,
        qos: int,
        aggregation_seconds: float,
        max_keys: int,
    ) -> None:
        self._publish = publish
        self.topic = topic
        self.qos = qos
        self.aggregation_seconds = aggregation_seconds
        self.max_keys = max_keys
        self._lock = Lock()
        self._aggregates: dict[str, _AggregateState] = {}
        self._suppressed = 0

    def emit(self, record: dict) -> None:
        key = str(record.get("aggregate_key") or record.get("event") or "event")
        now = monotonic()
        publish_record = None
        with self._lock:
            state = self._aggregates.get(key)
            if state is None:
                if len(self._aggregates) >= self.max_keys:
                    oldest_key = min(
                        self._aggregates, key=lambda k: self._aggregates[k].first_at
                    )
                    self._aggregates.pop(oldest_key, None)
                self._aggregates[key] = _AggregateState(
                    count=1, first_at=now, last_record=record
                )
                publish_record = record
            else:
                state.count += 1
                state.last_record = record
                if now - state.first_at >= self.aggregation_seconds:
                    publish_record = dict(record)
                    publish_record["count"] = state.count
                    state.count = 0
                    state.first_at = now
                else:
                    self._suppressed += 1
        if publish_record is None:
            return
        try:
            payload = json.dumps(
                publish_record, ensure_ascii=True, separators=(",", ":")
            ).encode("utf-8")
            self._publish(self.topic, payload, qos=self.qos, retain=False)
        except Exception:
            # ログ転送失敗はstdout一次記録を妨げない。再帰通知もしない。
            return

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "aggregate_keys": len(self._aggregates),
                "suppressed": self._suppressed,
            }


class MqttLogHandler(logging.Handler):
    def __init__(self, publisher: OperationLogPublisher) -> None:
        super().__init__(level=logging.INFO)
        self.publisher = publisher

    def emit(self, record: logging.LogRecord) -> None:
        if getattr(record, "skip_mqtt_forward", False):
            return
        if record.levelno < logging.INFO:
            return
        try:
            event = getattr(record, "event", record.name)
            payload = {
                "logged_at": _utc_now(),
                "level": record.levelname,
                "event": event,
                "server_run_id": getattr(record, "server_run_id", None),
                "message": record.getMessage(),
            }
            for key in (
                "device_code",
                "model_version",
                "window_end",
                "duration_ms",
                "error_code",
                "count",
                "event_id",
                "reason",
            ):
                value = getattr(record, key, None)
                if value is not None:
                    payload[key] = _sanitize(value)
            aggregate_key = getattr(record, "aggregate_key", None)
            if aggregate_key:
                payload["aggregate_key"] = str(aggregate_key)
            self.publisher.emit(payload)
        except Exception:
            return


def configure_logging(*, publish=None, settings=None) -> str:
    server_run_id = str(uuid4())
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(logging.INFO)
    run_filter = _RunIdFilter(server_run_id)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter(server_run_id=server_run_id))
    handler.addFilter(run_filter)
    root.addHandler(handler)

    if publish is not None and settings is not None:
        attach_mqtt_forwarding(
            root, publish=publish, settings=settings, run_filter=run_filter
        )
    return server_run_id


def attach_mqtt_forwarding(
    root: logging.Logger, *, publish, settings, run_filter: logging.Filter
) -> None:
    publisher = OperationLogPublisher(
        publish,
        topic=settings.log_topic,
        qos=settings.log_qos,
        aggregation_seconds=SettingsLike.aggregation_seconds(settings),
        max_keys=SettingsLike.aggregation_max_keys(settings),
    )
    mqtt_handler = MqttLogHandler(publisher)
    mqtt_handler.addFilter(run_filter)
    root.addHandler(mqtt_handler)
    logging.getLogger(__name__).info(
        "LOG_FORWARDING_ENABLED",
        extra={"event": "LOG_FORWARDING_ENABLED"},
    )


class SettingsLike:
    @staticmethod
    def aggregation_seconds(settings) -> float:
        return getattr(settings, "LOG_AGGREGATION_SECONDS", 60.0)

    @staticmethod
    def aggregation_max_keys(settings) -> int:
        return getattr(settings, "LOG_AGGREGATION_MAX_KEYS", 128)
