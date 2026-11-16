# Pinned to current python:3.11-slim index digest for reproducible builds (resolved 3.11.18-slim-trixie at pin time).
ARG PYTHON_IMAGE=python:3.11-slim@sha256:07d4824036af339fa1b6ef769cc99d9c10a141769538b52b3b597c84f7a7b535
ARG UV_IMAGE=ghcr.io/astral-sh/uv:0.13.8
FROM ${UV_IMAGE} AS uv-bin

FROM ${PYTHON_IMAGE} AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# HTTP・MQTT・モデル推論の固定依存を準備する。
FROM base AS deps
WORKDIR /app
COPY --from=uv-bin /uv /uvx /bin/
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-install-project --no-dev

FROM base AS runner
WORKDIR /app
RUN groupadd --system appuser \
    && useradd --system --gid appuser appuser
COPY --from=deps /opt/venv /opt/venv
COPY --chown=appuser:appuser app ./app
COPY --chown=appuser:appuser artifacts/model_manifest.json ./artifacts/model_manifest.json
COPY --chown=appuser:appuser artifacts/sisfall_model/ ./artifacts/sisfall_model/
USER appuser
# 開発用の待受ポート。本番用ポートは未決定。
EXPOSE 8000

# main/ai を実行ルートとする唯一の ASGI 入口。
# MQTT の二重購読を防ぐため、1 worker・reload なしで起動する。
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
