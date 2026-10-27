FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# 現段階では FastAPI / Uvicorn の依存関係のみを準備する。
FROM base AS deps
WORKDIR /app
RUN pip install --no-cache-dir uv
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project --no-dev

FROM base AS runner
WORKDIR /app
RUN groupadd --system appuser \
    && useradd --system --gid appuser appuser
COPY --from=deps /opt/venv /opt/venv
COPY --chown=appuser:appuser app ./app
USER appuser
# 開発用の待受ポート。本番用ポートは未決定。
EXPOSE 8000

# main/ai を実行ルートとする唯一の ASGI 入口。
# MQTT の二重購読を防ぐため、1 worker・reload なしで起動する。
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
