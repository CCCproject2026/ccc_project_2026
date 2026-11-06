"""環境変数の検証。MQTT接続設定と今後の推論設定を管理する。"""

import os
from collections.abc import Mapping
from dataclasses import dataclass, field
from math import isfinite
from typing import ClassVar, TypeVar

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

    QUEUE_CAPACITY: ClassVar[int] = 16
    SHUTDOWN_TIMEOUT_SECONDS: ClassVar[float] = 5.0

    def __post_init__(self) -> None:
        if not self.mqtt_host.strip() or not self.mqtt_client_id.strip():
            raise ValueError("MQTT_HOST / MQTT_CLIENT_ID: 空にはできません")
        if self.mqtt_qos not in (0, 1) or not 1 <= self.mqtt_keepalive <= 65535:
            raise ValueError("MQTT_QOSは0/1、KEEPALIVEは1〜65535")
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
        )
