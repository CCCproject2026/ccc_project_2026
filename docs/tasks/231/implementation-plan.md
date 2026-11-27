# Implementation Plan — 実装計画

## Task情報・実装目的

Issue: https://github.com/CCCproject2026/ccc_project_2026/issues/231
設計: [basic-design.md](basic-design.md)、[detailed-design.md](detailed-design.md)
目的: 追跡済み生成物だけで同期チェックを成功させる。

## 実装対象・変更ファイル

`.gitignore`、`.agents/skills/**` の生成済み参照資料、`.opencode/skills/**` の生成済みSkill/参照資料、既存生成物の正本との差異、`docs/tasks/231/`。

## 開発環境

リポジトリルートでPython 3.11以上を使用する。外部サービスは不要。

## 作業Task

<!-- 順序、Owner、Priority、依存Task、現在のStatusを記入。 -->

| No | Task | Owner | Priority | Dependency | Status |
| -- | ---- | ----- | -------- | ---------- | ------ |
| 1 | 正本と生成器・ignore規則を確認 | Agent | High | なし | 完了 |
| 2 | 生成物を再生成し、共有対象を追跡可能にする | Agent | High | 1 | 完了 |
| 3 | 同期・安全性テストと差分検査を実行 | Agent | High | 2 | 実施中 |
| 4 | 独立レビュー後にPRを作成 | Agent | High | 3 | 未着手 |

## テスト対象・完了条件

`test-plan.md` のTC-01〜TC-04により、同期一致、クリーン展開、生成器の安全性、差分の空白エラーを確認する。

## Risk・未決事項

ignore規則を広げ過ぎると個人設定を追跡する危険があるため、`.agents/skills` の参照資料だけを対象にする。OpenCode実クライアントの探索動作は未検証として明記する。
