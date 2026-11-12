# チーム向けAgent Coding利用ガイド

この環境は、ツールが違っても同じ実装原則・データ契約確認・独立レビュー・日本語の学習解説を共有するためのものです。

[最終報告・技術解説・構成Tree](report.md) · [検証記録](verification.md)

## 初回導入

1. リポジトリルートを開き、[共通AGENTS](../../AGENTS.md)、[調査](investigation.md)、[設計](design.md) を確認する。
2. Python 3.11以上で `python3 scripts/agent-coding/sync.py --check`。生成済み通常ファイルをGit共有するので、利用者全員が生成する必要はない。
3. 希望ツールを各自の組織承認済みアカウントで起動する。[ツール別読込テスト](tool-support.md) で指示・Skill・Agentを確認する。
4. 機密ソース/利用者データの外部AI取扱規則と利用可能なモデル/権限を組織担当者に確認する。秘密値は共有ファイルへ入れない。

## 毎日の作業

Issueと受入条件を渡し、対象領域のSkill/Roleを選ぶ。既存 `docs/development/workflow.md` の設計を作り、[Agent開発フロー](workflow.md) で実装→検証→独立レビューへ進む。各完了報告は日本語8項目。Merge/Deploy等の承認は人間が行う。

- Web: `nextjs-frontend` / `nextjs-specialist`
- AI/IoT: `fastapi-ml-iot` / `python-ml-iot-specialist`。契約変更には `iot-data-contract`
- レビュー: 別Agent/人間 + `code-review` / `senior-code-reviewer`
- 検証・説明・機密境界: 必要に応じて `testing-and-verification`、`learning-oriented-explanation`、`security-and-privacy`

## 設定を変更する人へ

AGENTSが共通規則、`docs/agent-coding/skills/` がSkill正本、`roles/` がRole正本。生成先のSkill/Agentは直接編集しない。Role adapterの配置/metadata変更は `scripts/agent-coding/sync.py` を変更し、`--write` → `--check` → `git diff` → 実クライアントの再確認を行う。未管理の既存ファイルが衝突した場合は生成器が停止するので、差分を読んで手動統合する。古い生成物を削除する場合は呼出元を確認して明示的に削除し、無関係な個人設定を消さない。

## よく使うプロンプト

```text
Issue <番号> の <受入条件> を満たす最小変更を行ってください。
AGENTS.mdとnextjs-frontend Skill、nextjs-specialist Roleを読み、現行の認可と
Server/Client境界を調査。対象ファイルと設計理由を示して実装し、検証と日本語8項目解説を返す。
```

```text
iot-data-contractを使い、センサーからモデルまでの契約を調査してください。
Topic、時刻、単位、軸順序、周波数、Window、前処理について、コード根拠・設計・未合意を分ける。
実機やモデルの値を推測で補わず、アプリコードは変更しない。
```

```text
senior-code-reviewerへ独立レビューを委任してください。
対象は <commitまたは差分範囲>、受入条件は <条件>。実コードと検証記録を確認し、
Severity、ファイル:行、障害シナリオ、修正案、学習ポイントを返す。編集・送信は禁止。
委任できなければ未実施と示し、別セッション/人間に渡す資料をまとめる。
```

```text
変更に必要な検証をtesting-and-verificationで選んで実行し、成功/失敗/スキップ/未実行を分ける。
外部Broker、実DB、利用者データは使わない。環境が足りない項目は理由と再現手順を記録する。
```

## 未解決・人間の判断が必要な項目

| 項目 | 判断/設定する担当 | 完了条件 |
|---|---|---|
| 各ツールの有効化と読込 | 各メンバー/組織管理者 | 対応表の発見・本文読込・明示呼出ログ |
| 外部AIへの機密情報の扱い | 学校/組織・PM | 許可データ/サービス/保持方針の確認 |
| IoT機種・物理軸・単位・50Hz精度 | IoT/AI担当 | 実測とモデル特徴対応の合意 |
| モデルとScaler・既知IO・数値許容差 | モデル提供者/AI担当 | 信頼できる配布と再現確認。再学習は別依頼 |
| Window接続・出力Topic/重複/遅延 | AI/Web/IoT担当 | 契約承認と結合検証 |
| Device API URL/token/TLS・cache許容 | Web/AI/インフラ | 安全な秘密配布、実通信、契約承認 |
| 本番Broker認証/ACL・DB・deploy/rollback | インフラ/PM | 開発匿名設定から分離し、承認済み運用 |
| 古いREADMEと現行実装の差 | 各領域担当 | 別Taskで技術文書更新 |
| main保護・人間レビュー・Merge/Deploy | Maintainer | リモート設定の確認と操作への明示承認 |

リポジトリ設定だけでこれらの承認・実機検証は完了しません。[実際の検証記録](verification.md) に未実行を残します。
