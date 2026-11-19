# 実装構成の索引

この資料は説明の出発点である。回答する箇所の現在のコードを必ず再確認する。

## 確認済みの構成

- Web は `main/web` の Next.js App Router。画面入口は `src/app/`、機能単位の実装は `src/features/`、共通処理は `src/shared/` にある。
- Web のサーバー側は Prisma を通じて PostgreSQL を扱う。Prisma schema は `main/web/prisma/schema.prisma`、migration は `main/web/prisma/migrations/` にある。
- AI server は `main/ai/app/main.py` の FastAPI ASGI アプリ。`app/core/lifespan.py` が起動時に `InferenceEngine` と `InputPipeline` を組み立てる。
- センサー入力の実装済み経路は MQTT broker → `MqttSensorInput` の有限Queue → `InputPipeline` の単一Worker → JSON/Topic/Device状態検証である。実機Firmwareはリポジトリで確認できない。
- `main/iot/mock-data/` の生成・publish script は模擬送信であり、実機の仕様証拠ではない。
- `docker-compose.yml` は `ai-server`、`web-app`、一度だけ実行する `migrate`、tools用 `prisma`、`mqtt-broker`、`db` を定義する。Compose 起動は migration と外部通信を伴いうるため、説明Skillは起動しない。

## 重要な未接続点

`main/ai/app/processing/buffer.py` と `result.py` は docstring のみである。`InputPipeline._accept_batch()` は検証済みbatchをログに記録する箇所で終わり、連続Window生成、推論呼出、MQTT結果publish、Webへの通知は接続されていない。`GET /health/ready` は意図的に503を返す（`main/ai/app/main.py`）。

## 文書との差を扱う注意

古いREADMEや `main/docs/architecture.md` のHTTP入力、画像CNN、Socket.ioなどを現行動作と断定しない。説明では、現行実装に対応するファイルを根拠にし、文書と食い違う場合は差分として示す。

## 設定・CI

- 秘密値は引用しない。利用可能な変数名は `main/web/.env.example`、`main/ai/.env.example` と各設定読込コードで確認する。
- Web依存とscriptは `main/web/package.json` と `pnpm-lock.yaml`、AI依存は `main/ai/pyproject.toml` と `uv.lock`、broker設定は `main/broker/mosquitto.conf` にある。
- CIは `.github/workflows/`。現在何が検証されるかは各workflowを読む。
