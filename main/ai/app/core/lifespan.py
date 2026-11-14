"""起動時に依存を組み立て、終了時に所有リソースを解放する。"""

import asyncio
import logging
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass

from fastapi import FastAPI

from app.core.config import Settings
from app.processing.inference import InferenceEngine
from app.processing.pipeline import InputPipeline

logger = logging.getLogger(__name__)


@dataclass
class Runtime:
    settings: Settings
    pipeline: InputPipeline
    inference: InferenceEngine
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
    # 設計04: MQTT受付より前に一度ロードする。失敗時は起動を中止する。
    try:
        inference = await asyncio.to_thread(InferenceEngine.load, settings)
    except Exception:
        logger.exception("MODEL_LOAD_FAILED")
        raise
    logger.info("MODEL_LOADED model_version=%s", inference.model_version)
    runtime = Runtime(
        settings=settings,
        pipeline=InputPipeline(settings, inference),
        inference=inference,
    )
    app.state.runtime = runtime
    try:
        runtime.pipeline.start()
        runtime.started = True
        yield
    finally:
        runtime.started = False
        # thread joinでASGIイベントループを止めない。
        await asyncio.to_thread(runtime.pipeline.stop)
