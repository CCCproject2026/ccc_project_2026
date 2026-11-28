"""唯一の ASGI 入口: main/ai を実行ルートにして app.main:app を指定する。"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.lifespan import lifespan

app = FastAPI(title="AI Server", lifespan=lifespan)


@app.get("/health/live")
async def live(request: Request) -> JSONResponse:
    """アプリと入力Workerの生存。Broker切断だけではliveを落とさない。"""
    runtime = getattr(request.app.state, "runtime", None)
    running = (
        runtime is not None and runtime.started and runtime.pipeline.worker.is_alive()
    )
    return JSONResponse(
        status_code=200 if running else 503,
        content={"status": "live" if running else "stopped"},
    )


@app.get("/health/ready")
async def ready(request: Request) -> JSONResponse:
    """モデル読込と、Device確認から結果配信までの準備完了を区別する。"""
    runtime = getattr(request.app.state, "runtime", None)
    return JSONResponse(
        status_code=503,
        content={
            "status": "not_ready",
            "reason": "inference_pipeline_not_connected",
            "model_loaded": runtime is not None and runtime.started,
            "model_version": runtime.inference.model_version if runtime else None,
            "model_compatibility_verified": False,
            "device_api": runtime.pipeline.snapshot()["device_api"]
            if runtime
            else {"configured": False},
        },
    )


@app.get("/health/input")
async def input_health(request: Request) -> JSONResponse:
    """接続・購読・Workerの状態を表示。生データや接続資格情報は返さない。"""
    runtime = getattr(request.app.state, "runtime", None)
    if runtime is None or not runtime.started:
        return JSONResponse(status_code=503, content={"status": "stopped"})
    state = runtime.pipeline.snapshot()
    ready = state["connected"] and state["subscribed"] and state["worker_alive"]
    return JSONResponse(
        status_code=200 if ready else 503,
        content={"status": "receiving" if ready else "not_receiving", **state},
    )
