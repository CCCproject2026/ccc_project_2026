"""環境変数の検証。外部契約未確定の設定は保持するだけで接続しない。"""

import os
from collections.abc import Mapping
from dataclasses import dataclass, field
from math import isfinite
from typing import ClassVar, TypeVar

Number = TypeVar("Number", int, float)


@dataclass(frozen=True)
class Settings:
    """開発用の起動設定。外部接続・実モデルの初期化は未実装。"""

    window_size: int = 100
    window_step: int = 50  # 開発用の候補値。本番の合意値ではない。
    sampling_rate: float = 50.0
    inference_threshold: float = 0.5
    mqtt_host: str = ""
    mqtt_port: int = 8883
    mqtt_username: str = field(default="", repr=False)
    mqtt_password: str = field(default="", repr=False)
    device_api_url: str = field(default="", repr=False)
    device_api_token: str = field(default="", repr=False)
    model_path: str = ""
    scaler_path: str = ""
    model_version: str = ""

    QUEUE_CAPACITY: ClassVar[int] = 500
    SHUTDOWN_TIMEOUT_SECONDS: ClassVar[float] = 5.0

    def __post_init__(self) -> None:
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

        return cls(
            window_size=number("WINDOW_SIZE", "100", int),
            window_step=number("WINDOW_STEP", "50", int),
            sampling_rate=number("SAMPLING_RATE", "50", float),
            inference_threshold=number("INFERENCE_THRESHOLD", "0.5", float),
            mqtt_host=source.get("MQTT_HOST", ""),
            mqtt_port=number("MQTT_PORT", "8883", int),
            mqtt_username=source.get("MQTT_USERNAME", ""),
            mqtt_password=source.get("MQTT_PASSWORD", ""),
            device_api_url=source.get("DEVICE_API_URL", ""),
            device_api_token=source.get("DEVICE_API_TOKEN", ""),
            model_path=source.get("MODEL_PATH", ""),
            scaler_path=source.get("SCALER_PATH", ""),
            model_version=source.get("MODEL_VERSION", ""),
        )
