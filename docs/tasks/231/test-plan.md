# Test Plan — テスト計画

## Task情報・対象範囲

Issue: https://github.com/CCCproject2026/ccc_project_2026/issues/231
設計: [basic-design.md](basic-design.md)、[detailed-design.md](detailed-design.md)
対象は生成物同期とGit追跡。OpenCodeクライアントの導入・モデル接続は対象外。

## 受入条件との対応

「クリーンチェックアウトでcheck成功」はTC-01/02、「説明と追跡対象の一致」はTC-03、「正本との差分なし」はTC-01で確認する。

## 環境・テストデータ

Python 3.11以上、ローカルGitアーカイブを用いる。外部通信、秘密値、実利用者データは使用しない。

## テストケース

TC-01は通常の同期確認、TC-02は追跡漏れのないクリーン展開の確認、TC-03は追跡範囲の確認、TC-04は既存の生成器保護テストである。

| ID | 受入条件 | 前提・入力 | 手順 | 期待結果 | 結果 |
| -- | -------- | ---------- | ---- | -------- | ---- |
| TC-01 | 正本との差分なし | 作業ツリー | `sync.py --check` | 全期待ファイル一致、exit 0 | 成功 |
| TC-02 | クリーン展開でcheck成功 | `git archive HEAD` の展開先 | 展開先で `sync.py --check` | 追加手作業なしでexit 0 | 成功 |
| TC-03 | Git追跡対象と運用説明の一致 | `git ls-files` とREADME | OpenCode出力・`.agents`参照資料を確認 | 必須生成物が追跡される | 成功 |
| TC-04 | 生成器の安全性 | ローカル環境 | unittest suite | 既存の保護テスト全件成功 | 成功 |

## 実行結果・証跡

2026-11-24（Agent実行）。すべてexit 0。

- `python3 scripts/agent-coding/sync.py --check` — `PASS: 63 generated files match their sources`
- `python3 -m unittest discover -s scripts/agent-coding -p 'test_*.py' -v` — 4 tests passed
- `git archive HEAD` を一時ディレクトリへ展開後、`python3 scripts/agent-coding/sync.py --check` — pass
- `git diff --check` — pass

## 終了条件・残課題

TC-01〜TC-04が成功し、独立レビューで重大な指摘がなければ完了とする。OpenCode実クライアントの発見確認は未実施として残す。
