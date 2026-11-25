# Implementation Plan — 実装計画

## Task情報・実装目的

Issue #247。正本からスキル生成コピーを再生成し、全管理対象の一致を確認する。

## 実装対象・変更ファイル

`scripts/agent-coding/sync.py` を変更せず、管理済みの `SKILL.md` コピーとOpenCode向け `project-explainer` 参照資料を生成する。

## 開発環境

Python 3.11以上。外部サービス・DB・Node依存は不要。

## 作業Task

<!-- 順序、Owner、Priority、依存Task、現在のStatusを記入。 -->

| No | Task | Owner | Priority | Dependency | Status |
| -- | ---- | ----- | -------- | ---------- | ------ |
| 1 | 不一致と生成対象の確認 | Codex | High | なし | 完了 |
| 2 | 正本から生成コピーを同期 | Codex | High | 1 | 完了 |
| 3 | checkと既存生成器検証 | Codex | High | 2 | 完了 |
| 4 | 差分の独立レビュー | 人間または別Agent | Medium | 3 | 完了 |

## テスト対象・完了条件

`test-plan.md` の同期チェック・既存生成器検証・差分確認を行う。新しいテストコードは追加しない。

## Risk・未決事項

未管理ローカル設定を上書きするリスクは、生成器のマーカー・symlink検査で停止させる。停止時は手動確認する。

