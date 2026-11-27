"""環境変数の検証。MQTT接続・モデル設定を管理する。"""

import os
import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from math import isfinite
from typing import ClassVar, TypeVar
from urllib.parse import urlsplit

Number = TypeVar("Number", int, float)


@dataclass(frozen=True)
class Settings:
    """起動時に検証する設定。MQTT既定値はローカル開発用。"""

    window_size: int = 100
    window_step: int = 50  # 開発用の候補値。本番の合意値ではない。
    sampling_rate: float = 50.0
    inference_threshold: float = 0.5
    mqtt_host: str = "127.0.0.1"
    mqtt_port: int = 1883
    mqtt_client_id: str = "ccc-ai-input"
    mqtt_tls: bool = False
    mqtt_ca_file: str = ""
    mqtt_keepalive: int = 60
    mqtt_qos: int = 0
    mqtt_username: str = field(default="", repr=False)
    mqtt_password: str = field(default="", repr=False)
    device_api_url: str = field(default="", repr=False)
    device_api_token: str = field(default="", repr=False)
    model_path: str = ""
    scaler_path: str = ""
    model_version: str = ""
    offline_timeout_seconds: float | None = None
    result_topic_template: str = "fall/{device_code}/events"
    log_topic: str = "ai/server/logs"
    result_qos: int = 1
    log_qos: int = 0

    QUEUE_CAPACITY: ClassVar[int] = 16
    SHUTDOWN_TIMEOUT_SECONDS: ClassVar[float] = 5.0
    PUBLISH_QUEUE_CAPACITY: ClassVar[int] = 100
    PUBLISH_INFLIGHT: ClassVar[int] = 10
    ACK_TIMEOUT_SECONDS: ClassVar[float] = 5.0
    PROGRESS_TIMEOUT_SECONDS: ClassVar[float] = 10.0
    INFERENCE_FAILURE_LIMIT: ClassVar[int] = 3
    LOG_AGGREGATION_SECONDS: ClassVar[float] = 60.0
    LOG_AGGREGATION_MAX_KEYS: ClassVar[int] = 128

    def __post_init__(self) -> None:
        if self.device_api_url or self.device_api_token:
            url = urlsplit(self.device_api_url)
            if (
                url.scheme != "https"
                or not url.hostname
                or url.username is not None
                or url.password is not None
                or url.path not in ("", "/")
                or url.query
                or url.fragment
                or any(char.isspace() for char in self.device_api_url)
            ):
                raise ValueError("DEVICE_API_URL: HTTPS originを指定してください")
            if url.port is not None and not 1 <= url.port <= 65535:
                raise ValueError("DEVICE_API_URL: portが不正です")
            if re.fullmatch(r"[A-Za-z0-9+/_=-]{32,}", self.device_api_token) is None:
                raise ValueError(
                    "DEVICE_API_TOKEN: 32文字以上の参照専用tokenが必要です"
                )
        if not self.mqtt_host.strip() or not self.mqtt_client_id.strip():
            raise ValueError("MQTT_HOST / MQTT_CLIENT_ID: 空にはできません")
        if self.mqtt_qos not in (0, 1) or not 1 <= self.mqtt_keepalive <= 65535:
            raise ValueError("MQTT_QOSは0/1、KEEPALIVEは1〜65535")
        if self.result_qos not in (0, 1):
            raise ValueError("RESULT_QOSは0/1を指定してください")
        if self.log_qos not in (0, 1):
            raise ValueError("LOG_QOSは0/1を指定してください")
        self._validate_topic_template(
            self.result_topic_template, placeholder="device_code"
        )
        self._validate_topic(self.log_topic, name="LOG_TOPIC")
        if self.mqtt_password and not self.mqtt_username:
            raise ValueError("MQTT_PASSWORDにはMQTT_USERNAMEが必要です")
        if self.mqtt_ca_file and not self.mqtt_tls:
            raise ValueError("MQTT_CA_FILEにはMQTT_TLS=trueが必要です")
        if self.window_size != 100:
            raise ValueError("WINDOW_SIZE: 100 のみ対応しています")
        if not 1 <= self.window_step <= self.window_size:
            raise ValueError("WINDOW_STEP: 1〜100 を指定してください")
        if self.sampling_rate != 50.0:
            raise ValueError("SAMPLING_RATE: 50 のみ対応しています")
        if not isfinite(self.inference_threshold) or self.inference_threshold != 0.5:
            raise ValueError("INFERENCE_THRESHOLD: 0.5 のみ対応しています")
        if not 1 <= self.mqtt_port <= 65535:
            raise ValueError("MQTT_PORT: 1〜65535 を指定してください")
        if self.offline_timeout_seconds is not None and (
            not isfinite(self.offline_timeout_seconds)
            or self.offline_timeout_seconds <= 0
        ):
            raise ValueError("OFFLINE_TIMEOUT_SECONDS: 正の秒数を指定してください")

    @staticmethod
    def _validate_topic(topic: str, *, name: str) -> None:
        if (
            not topic
            or any(ch.isspace() for ch in topic)
            or "#" in topic
            or "+" in topic
            or len(topic.encode("utf-8")) > 65535
        ):
            raise ValueError(f"{name}: 有効なMQTT Topicを指定してください")

    @classmethod
    def _validate_topic_template(cls, template: str, *, placeholder: str) -> None:
        token = f"{{{placeholder}}}"
        if template.count(token) != 1:
            raise ValueError(
                "RESULT_TOPIC_TEMPLATE: device_codeプレースホルダが必要です"
            )
        probe = template.replace(token, "device-001")
        cls._validate_topic(probe, name="RESULT_TOPIC_TEMPLATE")

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "Settings":
        """プロセス環境から取得する。.env の自動読込や設定値のログ出力はしない。"""
        source = os.environ if env is None else env

        def number(name: str, default: str, convert: type[Number]) -> Number:
            try:
                return convert(source.get(name, default))
            except (ValueError, TypeError):
                raise ValueError(f"{name}: 数値形式が不正です") from None

        tls = source.get("MQTT_TLS", "false").lower()
        if tls not in ("true", "false"):
            raise ValueError("MQTT_TLS: true / false を指定してください")
        offline_timeout = source.get("OFFLINE_TIMEOUT_SECONDS", "")
        offline_timeout_seconds = (
            None
            if offline_timeout == ""
            else number("OFFLINE_TIMEOUT_SECONDS", offline_timeout, float)
        )

        return cls(
            window_size=number("WINDOW_SIZE", "100", int),
            window_step=number("WINDOW_STEP", "50", int),
            sampling_rate=number("SAMPLING_RATE", "50", float),
            inference_threshold=number("INFERENCE_THRESHOLD", "0.5", float),
            mqtt_host=source.get("MQTT_HOST", "127.0.0.1"),
            mqtt_port=number("MQTT_PORT", "1883", int),
            mqtt_client_id=source.get("MQTT_CLIENT_ID", "ccc-ai-input"),
            mqtt_tls=tls == "true",
            mqtt_ca_file=source.get("MQTT_CA_FILE", ""),
            mqtt_keepalive=number("MQTT_KEEPALIVE", "60", int),
            mqtt_qos=number("MQTT_QOS", "0", int),
            mqtt_username=source.get("MQTT_USERNAME", ""),
            mqtt_password=source.get("MQTT_PASSWORD", ""),
            device_api_url=source.get("DEVICE_API_URL", ""),
            device_api_token=source.get("DEVICE_API_TOKEN", ""),
            model_path=source.get("MODEL_PATH", ""),
            scaler_path=source.get("SCALER_PATH", ""),
            model_version=source.get("MODEL_VERSION", ""),
            offline_timeout_seconds=offline_timeout_seconds,
            result_topic_template=source.get(
                "RESULT_TOPIC_TEMPLATE", "fall/{device_code}/events"
            ),
            log_topic=source.get("LOG_TOPIC", "ai/server/logs"),
            result_qos=number("RESULT_QOS", "1", int),
            log_qos=number("LOG_QOS", "0", int),
        )
