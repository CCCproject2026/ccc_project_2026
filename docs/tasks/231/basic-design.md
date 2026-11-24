# Basic Design — 基本設計

## Task情報

Issue: https://github.com/CCCproject2026/ccc_project_2026/issues/231
Task名: OpenCode生成物をGit管理し、クリーンチェックアウトで同期検証できるようにする
領域: common
関連: `docs/agent-coding/README.md`、`scripts/agent-coding/sync.py`

## 目的・背景

`sync.py` が要求する生成物とGit追跡対象を一致させ、クローン直後に手作業なしで `--check` を実行可能にする。

## 対象範囲・対象外

生成済みSkill/Roleコピー、`.agents` の参照資料を追跡可能にするignore規則、Task設計書が対象。正本Skill/Role、個人用 `.agents` 設定、OpenCode本体は対象外。

## システム構成・コンポーネント責務

`docs/agent-coding/skills/` を正本とし、`sync.py` がツール別コピーを生成する。生成器を変えず、正本どおりの出力を追跡する。`.agents/skills` の参照資料だけを共有対象とし、他の `.agents` は除外を維持する。

## データフロー・処理フロー

正本Skill → `sync.py --write` → Git追跡済み生成コピー → クリーンチェックアウトで `sync.py --check`。差異があれば対象パスを表示して失敗する。

## 外部システムとの連携

外部サービス・ネットワーク通信はない。Python標準ライブラリとローカルGit追跡だけを使用する。

## 非機能要件

認証情報や個人データを生成物に含めない。個人用設定を含む `.agents` 全体は共有しない。

## 制約・前提条件

Python 3.11以上。既存の未管理ファイル保護・symlink拒否・孤児検出は維持する。

## 未決事項・備考

OpenCodeクライアントでの実探索は受入条件外であり、利用環境で別途確認する。
