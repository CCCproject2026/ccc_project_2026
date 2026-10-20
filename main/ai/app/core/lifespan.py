"""起動・終了とリソース所有の骨格。MQTT / Worker / 実モデルは未接続。"""

from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import AsyncIterator

from fastapi import FastAPI

from app.core.config import Settings


@dataclass
class Runtime:
    settings: Settings
    started: bool = False


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    runtime = Runtime(settings=Settings.from_env())
    app.state.runtime = runtime
    try:
        # 実装時: モデル検証 → Worker 開始 → MQTT 接続・SUBACK 確認。
        runtime.started = True
        yield
    finally:
        # 実リソースの停止・解放は各モジュールの接続時に追加する。
        runtime.started = False
