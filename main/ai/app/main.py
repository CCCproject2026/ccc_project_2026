"""唯一の ASGI 入口: main/ai を実行ルートにして app.main:app を指定する。"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.lifespan import lifespan

app = FastAPI(title="AI Server", lifespan=lifespan)


@app.get("/health/live")
async def live(request: Request) -> JSONResponse:
    runtime = getattr(request.app.state, "runtime", None)
    if runtime is None:
        return JSONResponse(status_code=503, content={"status": "stopped"})
    snap = runtime.snapshot()
    running = runtime.started and snap["pipeline"]["worker_alive"]
    return JSONResponse(
        status_code=200 if running else 503,
        content={
            "status": "live" if running else "stopped",
            "server_run_id": runtime.server_run_id,
        },
    )


@app.get("/health/ready")
async def ready(request: Request) -> JSONResponse:
    runtime = getattr(request.app.state, "runtime", None)
    if runtime is None:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "reason": "runtime_not_initialized"},
        )
    snap = runtime.snapshot()
    ready_state = snap["ready"]
    return JSONResponse(
        status_code=200 if ready_state else 503,
        content={
            "status": "ready" if ready_state else "not_ready",
            "model_loaded": snap["model_loaded"],
            "model_version": snap["model_version"],
            "model_compatibility_verified": snap["model_compatibility_verified"],
            "degraded_reasons": snap["degraded_reasons"],
            "device_api": snap["pipeline"]["device_api"],
        },
    )


@app.get("/health/input")
async def input_health(request: Request) -> JSONResponse:
    runtime = getattr(request.app.state, "runtime", None)
    if runtime is None or not runtime.started:
        return JSONResponse(status_code=503, content={"status": "stopped"})
    state = runtime.pipeline.snapshot()
    receiving = state["connected"] and state["subscribed"] and state["worker_alive"]
    return JSONResponse(
        status_code=200 if receiving else 503,
        content={"status": "receiving" if receiving else "not_receiving", **state},
    )
