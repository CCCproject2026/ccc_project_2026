# コマンドと検証範囲

秘密値をログに出さない。接続先を確認し、DB操作・外部送信を伴う起動を静的検査と混同しない。

| 作業場所 | コマンド | 意味・前提 |
|---|---|---|
| root | `python3 scripts/agent-coding/sync.py --check` | 生成設定の一致確認。Python 3.11以上 |
| root | `python3 -m unittest discover -s scripts/agent-coding -p 'test_*.py' -v` | 生成器の上書き/残存/リンク保護を一時環境で検証 |
| root | `git diff --check` | 追跡差分の空白エラー。未追跡内容は別途確認 |
| main/web | `pnpm install --frozen-lockfile` | 依存取得。ネットワークとinstall scriptを伴う |
| main/web | `pnpm lint` | CIのESLint |
| main/web | `pnpm biome:check` | 補助の整形/lint。全ファイル自動修正はしない |
| main/web | `pnpm prisma:validate` | schema検査。環境設定が必要 |
| main/web | `pnpm build` | Prisma client生成 + Next build。実行環境・認証設定依存 |
| root | `make -C main/ai check` | uvx Ruff lint/format check。未キャッシュなら取得が必要 |
| root | `ruff check main/ai main/iot` / `ruff format --check main/ai main/iot` | CI Python範囲、Ruff導入済みの場合 |
| root | `node --test scripts/task-prep/*.test.cjs scripts/task-sync/*.test.cjs` | 既存自動化のテスト。APIはモック |
| main/ai | `uv sync --locked` | 固定依存取得。モデル互換性確認ではない |

Webに `test` script/Vitest依存はない。AIの常設テストスイートは調査で確認できない。変更の挙動に応じた正常・境界・障害検証を計画する。READMEの過去の成功を今回の成功として転載しない。

CIのmigration差分確認は `.github/workflows/lint.yml` の専用Postgres shadow DBを使用する。実DBをshadow DBに指定しない。`prisma:push` / `prisma:migrate` / `prisma:deploy` / `prisma:seed` は読み取り検査ではない。Compose全体起動もmigrateサービスを実行する。対象/データ影響/承認を確認してから実行する。

AI起動はモデル・Scalerの検証済み配布、Brokerが必要で、既存MQTT client IDとの競合がある。モックpublisherも実際に送信するため、隔離した開発Brokerを明示する。今回のAgent設定検証ではアプリ起動・モデルdeserialize・DB更新を行わない。
