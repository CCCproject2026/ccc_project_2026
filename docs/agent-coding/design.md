# 共通Agent Coding構成の設計

調査日: 2026-11-13。実装前にREADME・依存・コード・CI・既存開発運用・Git状態を調査した。結果は [調査レポート](investigation.md)。アプリソースを変更せず導入する。

## 階層と単一の正本

1. 常時指示: ルート `AGENTS.md`。安全性・Git・実装原則・日本語解説の共通規則。
2. 薄い入口: Claude/Geminiの公式importとCopilotの明示読込指示。ツール仕様は [対応表](tool-support.md)。
3. 手順: `docs/agent-coding/skills/<name>/SKILL.md` を正本とし、`.agents/skills`、`.claude/skills`、`.github/skills` に同一内容を生成する。
4. 専門性: `docs/agent-coding/roles/*.md` に責務を集約。ネイティブAgentはこのRoleを明示読込する薄いadapter。
5. 詳細: 既存契約・設計・今回の調査/検証資料を必要時だけ読む。

Skillsの名前/descriptionだけで選択でき、本文・参照資料は必要時に読むProgressive Disclosureを採用。7種類は対象が異なるため採用するが、毎Taskで全7件を起動する意味ではない。技術説明の必須8項目はAGENTSに保持するためSkillの自動選択に依存しない。

## 選択理由と代替

全ツールに長い規則を手でコピーすると更新漏れが起きる。共通AGENTSと正本Skill/Roleに集約し、Skillコピーの一致を検査する。SymlinkはOS/checkout/クライアント差があるため使用しない。各ツールの探索パスに通常ファイルを配置する。生成先を手修正して正本との差を隠さない。

`python3 scripts/agent-coding/sync.py --write` で生成、`--check` で不足/不一致を検出する。既存の非管理ファイルは上書きせず停止する。正本変更の前後で差分をレビューする。生成済みファイルの古い版はGit差分で確認できる。

`.agents/`・`.codex/` の一括ignoreはローカル情報保護に有益だが共有定義と競合する。共有SkillとAgent定義だけ例外化し、credentials・settings・session類は引き続き除外する。Claude/Geminiも共有定義以外を除外する。

## 既存運用との統合

Issue → 既存 `docs/tasks/<id>/` の設計テンプレート → 小さい実装 → 独立レビューを維持。新しいIssue自動化・外部送信・依存・CI権限は追加しない。PRテンプレートのnpm例とpnpm運用の差はガイドで明示し、アプリや既存自動化を変更しない。

READMEの旧構成、契約の将来仕様、実装済み機能の区別を保持する。タスク限定のテスト禁止を全体規則にしない。承認対象はユーザー指定のMerge/Deploy等に限定し、ローカル調査・文書作成・静的検証は進める。

## 限界

Agent定義は同じオーケストレーターではない。共通Roleが読めても独立コンテキスト・並列実行・tool制限は同一にならない。プロンプトでの禁止はOS権限ではない。環境変数・認証・本番接続・モデル再学習は一切自動設定しない。
