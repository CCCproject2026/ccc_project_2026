# リポジトリ調査レポート

調査日: 2026-11-13。Git root: `ccc_project_2026`、開始HEAD: `77a332c`。開始時 `git status --short` は空。既存ユーザー差分なし。アプリケーションソースは変更しない。以下のパスはroot基準。

## 実装から確認した構成

```text
IoT模擬送信 → Mosquitto → Paho callback → 有限Queue → 単一Worker
  → JSON/時刻/Topic検証 → Device API利用可否確認（設定時）→ 受理件数・ログ

起動時: manifest/hash → CPUモデルとScaler読込
未接続: 連続Buffer → 前処理 → 推論 → 結果Publish → Web通知

Next.js App Router → features/server → Clerk認証 + DBスタッフ認可 → Prisma/PostgreSQL
AI → HTTPS Device API → 専用Bearer認証 → Device code/status
```

根拠: `main/ai/app/{main.py,core/lifespan.py,processing/pipeline.py,application/sensor_input.py}`、`main/ai/README.md`、`main/web/src/shared/lib/auth.ts`、`main/web/src/features/device-management/server/`。`processing/buffer.py` と `result.py` はdocstringのみ。`/health/live` はWorker生存、`/health/input` はBroker/SUBACK/Worker、`/health/ready` は常時503。受信成功は推論可能を意味しない。

`main/web/src/features/dashboard/server/dashboard-service.ts` はDBから在籍者を取得し、RepeatableReadのtransactionを使用。旧READMEのSocket.io/HTTP alertを稼働済み経路とみなせない。実機Firmwareは調査したGit管理ソースになく、ESP32/MPU6050/Raspberry Piの採用実態は確定しない。

## 技術とバージョン

実行環境でインストール/稼働確認した値ではなく、宣言とlockfileの解決値。

| 領域 | 宣言・固定値 | 根拠 |
|---|---|---|
| Web | Next ^15.3.3 → 15.5.19、React ^19.0.0 → 19.2.6、TypeScript ^5.8.3 → 5.9.3 | package.json / pnpm-lock.yaml |
| Webデータ・認証 | Prisma/client 6.19.3、Clerk、Zod、React Query、Tailwind 4系 | 同上 |
| Web規約 | pnpm 9.15.0、ESLint 9、eslint-config-next 16系、Biome 2.5系、tab/LF/double quote | package.json / biome.json / eslint.config.mjs |
| Python | >=3.11、Docker 3.11、CI 3.12 | pyproject.toml / Dockerfile / lint.yml |
| AI | FastAPI 0.156.8、Uvicorn 0.54.0、Paho 2.1.0、HTTPX 0.28.1 | uv.lock |
| ML | torch 2.15.0（Linux/Windowsは+cpu）、NumPy 2.2.6、scikit-learn 1.6.1、joblib 1.6.0 | uv.lock |
| インフラ | Node 20、Compose Postgres 15-alpine、CI Postgres 16、Mosquitto 2 | Dockerfile / Compose / CI |

Nextとeslint-config-nextのmajor差、DB開発/CI major差は現状の差異として記録。今回アップグレードや互換性断定をしない。

## MQTT・センサー・モデルの契約

| 項目 | 確認結果・限界 |
|---|---|
| 入力Topic | `fall/+/data` 購読、`fall/{device_id}/data` とpayload code照合 |
| Payload | root: `device_id, ts, ts_ms, boot_ms, tz_offset_sec, samples`。各sampleは `t,ax,ay,az,gx,gy,gz`。余分/不足/重複キーを拒否 |
| サイズ | 1〜100点、64KiB以下。有限数のみ、bool/数値文字列は拒否。t先頭0・厳密増加 |
| 時刻 | UTC `ts_ms+t` が計測時刻。表示tsとts_msは差1msまで、offset整合を検査 |
| 通信 | MQTT3.1.1、QoS既定0/選択0・1、clean session、retained入力拒否、16バッチQueue |
| 周波数 | 設定/モデル入力50Hz、模擬生成50Hz。実機の周波数精度・欠落許容は未確認。decoderは20ms固定間隔の保証ではない |
| Window | モデル100点×6特徴、step50の設定。連続Window生成は未実装。通信バッチと推論Windowは別 |
| 軸/単位 | 順序ax,ay,az,gx,gy,gzはプロジェクトマッピング。提供学習コードはg,g,g,deg/s,deg/s,deg/s。実機物理軸/符号・モデルとの一致は未確認 |
| 前処理 | 物理量50Hz Window → 学習済みStandardScaler.transform → float32 → transpose → batch次元。runtime再fit/学習時200→50Hz downsampleの再適用はしない |
| モデル入力 | raw/scaler (100,6)、tensor NCL (1,6,100)、float32 |
| モデル出力 | (1,1) binary fall logit → sigmoidを1回 → >=0.5。0 normal / 1 fallは提供コードの意味、医学的確定ではない |
| 互換性 | manifestはreceived_pending_compatibility_confirmation。既知IO/許容誤差/軸/モデルとScaler組の提供者確認が未完了。実重みでの出力検証とCPU互換性未確認 |
| 結果Topic/Payload | result.pyは未実装。設計候補を実装契約として確定しない |

根拠: `main/ai/app/integrations/sensor_json.py`、`mqtt_client.py`、`application/sensor_input.py`、`processing/{preprocessing,inference}.py`、`artifacts/model_manifest.json`、`main/iot/mock-data/README.md`。MLファイルのdeserialize・再学習・実通信はこの調査では行っていない。

## APIとDB

- AIはhealthのGET3本のみで、HTTPセンサーPOSTはない。
- Device: `GET /api/devices/by-code/{deviceCode}`、専用Bearer。200は `{device_code,status}`、404は `{code,message}`。正確なstatus/headers/timeout/cacheは `docs/contracts/device-api/README.md` と `openapi.json`、実装は `device-lookup.ts` / `device-token.ts` / AI `integrations/device.py`。HTTPS origin、要求全体2秒・同一要求内retryなし、ACTIVE/INACTIVE TTL30秒、404 TTL5秒、上限128件、401/403で再起動まで停止。Web DBにはMAINTENANCEはない。
- Web APIは `src/app/api` のelders（GET/POSTと[id]）、profile（PATCH）、staff・invitations・activate・role・reinvite・sync、Clerk webhookを確認。ClerkセッションとDB role/statusを追う。profileは本人IDをサーバーで決定する。eldersには `{error}`、Device/profile等には共通エラーの利用があり、全APIが同じレスポンス形式と断定しない。Task対象のroute・schema・serviceを再確認する。
- Prisma modelは `User, Elder, Device, DeviceAssignment, ResponseRecord, ServerLog`。UserはCAREGIVER/NURSEとPENDING/ACTIVE/INACTIVE。Elder/DeviceはACTIVE/INACTIVE。
- `DeviceAssignment` は有効割当の部分一意index（elder/device）をSQL migrationで保持。期間/対応開始終了/空contentのCHECKもSQLにある。schema単独では全制約を表せない。
- `ResponseRecord` は人間の対応記録。MQTT受信だけで作成しない。ServerLogは運用ログで転倒履歴の代替ではない。外部キーRestrictとstatusによる無効化を維持する。

## 環境変数・起動・デプロイ

値を収集せず `.env.example` と設定コードのキーだけ確認した。

- AI: WINDOW_SIZE/STEP、SAMPLING_RATE、INFERENCE_THRESHOLD、MQTT_HOST/PORT/CLIENT_ID/KEEPALIVE/QOS/TLS/CA_FILE/USERNAME/PASSWORD、DEVICE_API_URL/TOKEN、MODEL_PATH/SCALER_PATH/MODEL_VERSION。
- Web: DATABASE_URL、NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY、CLERK_SECRET_KEY/WEBHOOK_SECRET、STAFF_TOKEN_SECRET、DEVICE_API_TOKEN、API_BASE_URL、APP_URL、BOOTSTRAP_NURSE_*。`shared/lib/env.ts` がサーバー必須値を検査。値/個人データは掲載しない。
- Compose: ai-server、web-app、migrate、prisma（tools）、mqtt-broker、db。8000/3000/1883/9001/5433をhost公開。migrateは起動時にprisma:deployを実行する。
- Brokerは匿名・非TLSの開発設定。公開本番への転用不可。AI Dockerは非root/1 worker、Webはstandalone。AI起動にはGit管理外の重み/Scalerが必要。
- AWS EC2はREADMEの記述。稼働中クラウド・TLS・ACL・本番port・秘密値配布・rollback運用は未確認。確認したActionsはlint/buildとTask自動化で、デプロイ成功の証拠はない。
- コマンドと副作用は [一覧](commands.md)。ComposeのVitestコメントに対応するtest serviceやWeb test scriptは見つからない。

## 既存Agent設定・競合・不足

AGENTS.md / CLAUDE.md / GEMINI.md / .agents / .codex / .claude / .geminiは開始時に存在しない。.githubはCI・Issueフォーム・PRテンプレート。既存Skill/専門Agentは調査範囲でなし。ユーザーホームの個人指示・他ツールの組織ポリシーは共有設定とは別であり、内容は収集していない。

既存ルールは `docs/development/workflow.md` のIssue/設計/branch/review、READMEのmain保護方針。`.gitignore` は .agents/.codexを一括除外。PRテンプレートのnpm例はpnpm宣言と不一致。古いREADMEにはHTTP/画像CNN/旧DB名が残る。Device契約文書のテスト禁止は当該タスクの履歴で、今回の設定検証や将来全Taskの禁止へ拡大しない。

不足は共通指示、ツールadapter、専門Role、再利用Skill、独立レビュー手順、読込の実証。推奨構成は [設計書](design.md)。人間が判断する契約/運用は [利用ガイド](README.md) に記録する。
