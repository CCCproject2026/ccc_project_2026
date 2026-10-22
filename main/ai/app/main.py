"""唯一の ASGI 入口: main/ai を実行ルートにして app.main:app を指定する。"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.lifespan import lifespan

app = FastAPI(title="AI Server", lifespan=lifespan)


@app.get("/health/live")
async def live(request: Request) -> JSONResponse:
    """骨格の起動状態のみ。Worker 生存監視は Worker 実装時に追加する。"""
    runtime = getattr(request.app.state, "runtime", None)
    running = runtime is not None and runtime.started
    return JSONResponse(
        status_code=200 if running else 503,
        content={"status": "live" if running else "stopped"},
    )


@app.get("/health/ready")
async def ready() -> JSONResponse:
    """実モデル・MQTT・Worker が未接続のため、非 Ready を返す。"""
    return JSONResponse(
        status_code=503,
        content={"status": "not_ready", "reason": "pipeline_not_implemented"},
    )
