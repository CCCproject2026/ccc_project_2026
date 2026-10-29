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

"""現在ではモデル未接続なので常に503を返す。将来は推論Workerの状態を反映する。"""
@app.get("/health/ready")
async def ready() -> JSONResponse:
    """入力受信と推論の準備状態を混同しない。モデル未接続なので非Ready。"""
    return JSONResponse(
        status_code=503,
        content={"status": "not_ready", "reason": "inference_not_implemented"},
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
