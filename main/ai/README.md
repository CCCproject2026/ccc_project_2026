# AI Server

「01 AI Server 詳細設計」と提示画像のモジュールを、役割ごとのフォルダーに分けた初期構成です。
画像の `ai-server/` を、このリポジトリでは `main/ai/` に配置しています。
ASGI 入口、設定読込、lifespan を実装した開発用の骨格です。
センサーデータ処理・外部接続・実モデル推論は未実装です。

## フォルダー構成

```text
main/ai/
├── app/
│   ├── main.py
│   ├── core/                  # 共通設定・データ構造・ログ
│   │   ├── config.py
│   │   ├── lifespan.py
│   │   ├── schemas.py
│   │   └── logging_setup.py
│   ├── integrations/          # 外部システムとの連携
│   │   ├── mqtt_client.py
│   │   └── device.py
│   └── processing/            # センサーデータの処理・推論
│       ├── pipeline.py
│       ├── buffer.py
│       ├── preprocessing.py
│       ├── inference.py
│       └── result.py
├── .env.example
├── Makefile
├── Dockerfile
├── pyproject.toml
└── README.md
```

`app/main.py` は起動入口として直下に置き、その他は次の責務で分けています。

- `core/`: 全体で共有する設定、データ検証用スキーマ、ログ設定。
- `integrations/`: MQTT Broker と Web Device API との通信・状態管理。
- `processing/`: 受信後の処理順序、Window 生成、前処理、推論、結果生成。

## ファイルごとの役割

| ファイル | 役割 |
| --- | --- |
| `app/main.py` | ASGI アプリと live / ready endpoint。Worker 監視は未実装。 |
| `app/core/config.py` | 環境変数の検証、接続情報・モデルパス・固定ポリシーの管理。 |
| `app/core/lifespan.py` | 設定読込、Runtime の所有、開始・停止状態の管理。 |
| `.env.example` | 秘密情報を含まない設定キーとローカル用の例。 |
| `app/core/schemas.py` | JSON・時刻・6 軸データ・結果の検証と受け渡し用データ構造。 |
| `app/integrations/mqtt_client.py` | TLS、購読、再接続、受信 Queue 投入、Publish 完了管理。 |
| `app/processing/pipeline.py` | 単一 Worker の処理順序、エラー境界、欠落・切断・OFFLINE 時の掃除。 |
| `app/integrations/device.py` | Web API による Device 確認、最小キャッシュ、稼働可否判定。 |
| `app/processing/buffer.py` | デバイス別の連続サンプル保持と 100 点の Window 生成。 |
| `app/processing/preprocessing.py` | 既存 StandardScaler の読込・変換とモデル用 Tensor の整形。 |
| `app/processing/inference.py` | 既存 PyTorch 1D-CNN の読込・推論・確率解釈・閾値 0.5 の判定。 |
| `app/processing/result.py` | 結果 JSON の生成と MQTT 送信要求。DB 保存や Alarm 制御は対象外。 |
| `app/core/logging_setup.py` | 共通の構造化ログ、stdout 出力、運用ログ MQTT 転送。 |
| `Dockerfile` | Python 3.11、uv による依存準備、非 root 実行、単一 worker の起動設定。 |
| `Makefile` | Ruff による AI Server 全体の自動修正・整形・チェック用コマンド。 |
| `pyproject.toml` | プロジェクト情報、Python 要件、Python 依存関係の管理。 |
| `README.md` | フォルダー構成、ファイルの責務、初期化段階の制約の説明。 |

## コードの自動修正・チェック

`uv`（`uvx` を含む）と `make` が必要です。Web の `biome:write` /
`biome:check` に相当するコマンドを用意しています。
リポジトリ直下から次を実行します。

```sh
# AI Server 全体を自動修正・整形し、最後にチェック
make -C main/ai fix

# ファイルを変更せずチェック
make -C main/ai check
```

`main/ai` に移動済みなら `make fix` / `make check` で実行できます。
`make lint` は lint のみ、`make format` は整形のみを実行します。

対象は `main/ai` 全体です。Web・IoT は変更しません。
Ruff のルールは `pyproject.toml` に定義し、`app` をプロジェクト内の
パッケージとして明示しています。実行場所による import 分類の差を防ぎます。
Ruff は `uvx` で用意するため、アプリの実行依存関係には追加しません。
初回は Ruff のダウンロードにネットワーク接続が必要です。
自動修正できないエラーは表示して停止するため、該当箇所を手動で直してください。
修正後は `git diff` で差分を確認してください。

## Docker と依存関係

`../web/Dockerfile` に合わせ、`base` → `deps` → `runner` のステージに分けています。
Python はコンパイル工程を必要としないため、独立した builder ステージは設けていません。
依存関係は uv で `/opt/venv` に導入し、runner は非 root ユーザーで実行します。
起動設定は Uvicorn 1 worker、reload なしです。
開発用ポートは 8000 です。本番用ポートは未決定です。

現段階では FastAPI と Uvicorn のみを定義しています。PyTorch、Scaler 関連、
MQTT、HTTPS client の依存関係は、モデル実物や外部契約の確認後に追加します。
依存バージョンの固定と lock ファイルは未整備であり、本番運用準備済みではありません。
画像の `uv init` はビルド時には実行せず、用意した `pyproject.toml` を使用します。

## 起動入口と設定

ルートの `docker-compose.yml` に `ai-server` サービスを定義しています。
リポジトリ直下から起動します。

```sh
docker compose up -d --build ai-server
```

全体の `docker compose up -d --build` にも含まれます。
Compose は `main/ai` の Dockerfile の runner ステージを使用し、
`.env.example` を読み込んで、設定と lifespan の骨格を起動します。
開発用に `8000:8000` を公開し、ホストから `http://localhost:8000` でアクセスできます。
本番用ポートは未決定です。
起動コマンドは Dockerfile の `app.main:app` を使用し、Compose では上書きしません。
現段階では外部接続しないため、Web・DB・MQTT への `depends_on` は設けていません。
healthcheck は `/health/live` を使用します。healthy は実推論の準備完了を意味しません。
独自設定を使う場合は Compose の `env_file` を Git 管理外の `.env` に変更してください。

実行ルートは `main/ai`、ASGI の指定は **`app.main:app`** に統一します。
`main/ai/app.main:app` はディレクトリと import 指定を混ぜた表記なので、
Uvicorn には渡しません。ローカルでは uv を用意した上で、リポジトリ直下から次を実行します。
以下の `--port 8000` は開発用ポートです。

```sh
cd main/ai
uv run --env-file .env.example uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

独自設定が必要なら `.env.example` を Git 管理外の `.env` にコピーし、
`--env-file .env` に変更します。アプリ自身は `.env` を自動読込しません。
Docker では実行時に `--env-file main/ai/.env.example` で注入します。
Dockerfile は `app/` のみコピーするため、`.env` はイメージへ入りません。

- 起動時は設定と lifespan のみ初期化します。モード切替の環境変数はありません。
- Window 100、Sampling rate 50、閾値 0.5 を検証します。Step は 1〜100、既定 50 は開発用の候補値です。
- MQTT / Device API / モデル設定は将来用の保持項目です。実接続用の必須・TLS・ファイル検証は未実装です。
- password / token / username / API URL は設定オブジェクトの repr に含めません。設定全体はログや health へ出しません。

`/health/live` は lifespan 起動後に 200、停止状態では 503 です。
Worker が未実装のため、現時点ではアプリの起動状態のみを表します。
`/health/ready` は常に 503 (`pipeline_not_implemented`) です。
実モデル・MQTT・Worker の接続と稼働判定は未実装です。

テスト・Docker ビルド・起動確認は実施していません。

旧 `features/inference/` の説明文のみの雛形は `app/` に整理し、
`requirements.txt` は `pyproject.toml` に置き換えています。
設計上、画像化による推論、モデル学習、PostgreSQL への直接接続は対象外です。

設計根拠: [01 AI Server 詳細設計](../../docs/detailed_design/ai-server/01_AI_Server_詳細設計.md)
