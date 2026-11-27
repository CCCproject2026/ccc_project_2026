"""起動時に依存を組み立て、終了時に所有リソースを解放する。"""

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from time import monotonic

from fastapi import FastAPI

from app.core.config import Settings
from app.core.logging_setup import attach_mqtt_forwarding, configure_logging
from app.processing.inference import InferenceEngine
from app.processing.pipeline import InputPipeline

logger = logging.getLogger(__name__)


@dataclass
class Runtime:
    settings: Settings
    pipeline: InputPipeline
    inference: InferenceEngine
    server_run_id: str
    started: bool = False
    ready: bool = False
    startup_error: str | None = None
    degraded_reasons: list[str] = field(default_factory=list)
    last_progress_at: float = field(default_factory=monotonic)

    def mark_progress(self) -> None:
        self.last_progress_at = monotonic()

    def snapshot(self) -> dict:
        pipeline = self.pipeline.snapshot()
        degraded = list(self.degraded_reasons)
        degraded.extend(self.pipeline.degraded_reasons())
        if (
            pipeline.get("last_progress_age_seconds", 0.0)
            > Settings.PROGRESS_TIMEOUT_SECONDS
        ):
            if "worker_progress_stalled" not in degraded:
                degraded.append("worker_progress_stalled")
        ready = self.started and not self.startup_error and self.pipeline.is_ready()
        return {
            "started": self.started,
            "ready": ready,
            "startup_error": self.startup_error,
            "model_loaded": True,
            "model_version": self.inference.model_version,
            "model_compatibility_verified": False,
            "degraded_reasons": sorted(set(degraded)),
            "pipeline": pipeline,
            "server_run_id": self.server_run_id,
        }


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = Settings.from_env()
    server_run_id = configure_logging(settings=settings)
    logger.info("SERVER_START", extra={"event": "SERVER_START"})

    try:
        inference = await asyncio.to_thread(InferenceEngine.load, settings)
    except Exception:
        logger.exception(
            "MODEL_LOAD_ERROR",
            extra={"event": "MODEL_LOAD_ERROR", "error_code": "MODEL_LOAD_ERROR"},
        )
        raise
    logger.info(
        "MODEL_LOADED",
        extra={"event": "MODEL_LOADED", "model_version": inference.model_version},
    )

    pipeline = InputPipeline(settings, inference)
    attach_mqtt_forwarding(
        logging.getLogger(),
        publish=pipeline.connection.publish,
        settings=settings,
        run_filter=logging.getLogger().handlers[0].filters[0],
    )
    runtime = Runtime(
        settings=settings,
        pipeline=pipeline,
        inference=inference,
        server_run_id=server_run_id,
    )
    app.state.runtime = runtime

    try:
        pipeline.start()
        runtime.started = True
        runtime.mark_progress()
        logger.info("SERVER_READY", extra={"event": "SERVER_READY"})
        yield
    finally:
        runtime.started = False
        runtime.ready = False
        await asyncio.to_thread(pipeline.stop)
