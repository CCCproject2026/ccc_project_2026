"""起動時に依存を組み立て、終了時に所有リソースを解放する。"""

import asyncio
import logging
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass

from fastapi import FastAPI

from app.core.config import Settings
from app.processing.pipeline import InputPipeline


@dataclass
class Runtime:
    settings: Settings
    pipeline: InputPipeline
    started: bool = False


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # logging_setupの運用ログ転送は別作業。今回は標準ログを使う。
    logging.basicConfig(
        level=logging.INFO,
        stream=sys.stdout,
        format="%(levelname)s %(name)s %(message)s",
    )
    settings = Settings.from_env()
    runtime = Runtime(settings=settings, pipeline=InputPipeline(settings))
    app.state.runtime = runtime
    try:
        runtime.pipeline.start()
        runtime.started = True
        yield
    finally:
        runtime.started = False
        # thread joinでASGIイベントループを止めない。
        await asyncio.to_thread(runtime.pipeline.stop)
