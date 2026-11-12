# ツール仕様と読込検証

確認日: 2026-11-13。**公式仕様、ローカル発見、LLMによる適用は別の証拠**。下表の「仕様上」は実機成功を意味しない。新しいセッションをリポジトリルートで開始する。個人/組織の上位設定・workspace trust・disabled skillsで結果が変わる。

| AIツール | 設定ファイル | 自動読み込み（仕様上） | 明示的な呼び出し | 検証方法 |
|---|---|---|---|---|
| Claude Code | CLAUDE.md → @AGENTS.md、.claude/skills、.claude/agents | CLAUDEのimport、Skill metadata、Agent定義を探索 | `/nextjs-frontend` 等、専門Agentを名前で依頼。本文/Roleは必要時読込 | `/memory` で入口確認、`/agents` とSkillメニューで一覧、下記プロンプトとtool履歴で適用確認 |
| Codex | AGENTS.md、.agents/skills、.codex/agents/*.toml | project指示、Skill metadata、対応版でcustom agent | `$nextjs-frontend` 等、専門Agentへの委任を明示依頼 | 新規セッションで有効指示、Skill選択肢、委任先とRoleのreadを確認 |
| GitHub Copilot | .github/copilot-instructions.md、.github/skills、.github/agents/*.agent.md | 対応clientで指示/Skill metadata/Agentを探索。CLIはAGENTSも探索 | Skillメニュー、Custom Agent選択（CLIは `--agent`）。共通AGENTSの明示read | CLI `instruction list` / `skill list`、IDEの参照表示とAgent選択、下記テスト |
| Gemini CLI | GEMINI.md → @./AGENTS.md、.agents/skills、.gemini/agents | import、Skill metadata、対応版でAgent探索 | `/skills list` 後Skill名を指定してactivate、Agent名で委任依頼 | `/memory show`、`/skills list`、Roleのread/委任tool履歴。古い版や無効設定ではfallback |

CopilotのMarkdownリンクは自動import構文ではないため、adapterにAGENTSを読む指示を入れる。Copilot CLIは複数のSkill探索パスを持つため、同名コピーの優先/表示を実機で確認する。コピーは同期検査で同一内容を保証する。Claude/Geminiのimportも信頼設定や個人のcontext設定で変わるため、表示/履歴で確認する。

Roleファイル自体はどのツールにも共通する自動探索規格ではない。各native adapterが読込を要求する。未対応clientでは「このRole文書を読んで担当して」と依頼できるが、それだけで独立したsubagent/並列実行にはならない。独立レビューは別セッションまたは人間で実施する。

ネイティブ定義を4ツールに用意したが、モデル/権限/オーケストレーションを共通化しない。Claude/Copilot/GeminiのReviewerはread/search系toolだけを宣言。Codexのcustom agentではsandbox_modeを個別定義しても親の設定を上書きしないため、親セッションの権限と読み取り指示で制限する。追加検証は実装担当が行い、Reviewerへ結果を渡す。

## 共通の読込テスト（新しい会話で実行）

```text
アプリ変更や外部送信は行わず、このプロジェクトのAgent環境を確認してください。
1. 現在有効なプロジェクト指示のパスと、Merge/Deploy承認・日本語解説のルールを示す。
2. 利用可能なプロジェクトSkillsを列挙し、名前/説明のみ発見済みか本文も読込済みか分ける。
3. 専門Role/Agentの名前を示し、ネイティブ委任と文書による役割指定を区別する。
4. 自動読込した情報と、この依頼で明示的に読んだ情報を、参照表示/tool履歴を根拠に分ける。
5. バージョン・trust・権限・非対応機能・未検証事項を報告する。自己申告だけで読込成功としない。
```

明示呼出テスト: 各ツールの上表の方法で `iot-data-contract` を呼び出し、「50Hz/100点は実機確認済みか、現行実装と未合意事項を分けて説明。変更禁止」と依頼する。合格はSkill本文の読込/activationが確認でき、実機軸・連続Buffer・既知IOを未確認として扱うこと。自動選択は別の新規会話でSkill名を使わず同じ質問を試す。選択されなかった場合も発見成功と適用成功を混同しない。

Custom Agentテスト: `senior-code-reviewer` を選択または委任して「AGENTSとRoleを読み、Agent設定差分を読み取りレビュー」と依頼する。親からの委任イベント/別コンテキスト、Roleのread、変更なし、根拠付き報告を確認する。Agent選択のない会話でRoleを読んだだけならfallbackと記録する。

指示が見えなければroot/CWD・個人override・workspace trust・機能無効化を確認し、再起動する。trust/権限を一括緩和して通さない。確認ログには秘密値を含めない。

## 公式仕様の参照

- Codex: [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[Skills](https://learn.chatgpt.com/docs/build-skills)、[Subagents/schema](https://learn.chatgpt.com/docs/agent-configuration/subagents)。指示階層、.agents/skills探索、.codex/agentsのTOML schemaに使用。
- Claude: [Memory/import](https://code.claude.com/docs/en/memory)、[Skills](https://code.claude.com/docs/en/skills)、[Subagents](https://code.claude.com/docs/en/sub-agents)。CLAUDE.md、.claudeの配置/明示呼出に使用。
- Copilot: [Instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)、[Custom Agent schema](https://docs.github.com/en/copilot/reference/custom-agents-configuration)、[VS Code Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills)。IDE/cloudの機能差を確認。CLIの詳細はインストール済み `copilot --help` と各subcommand helpでも確認。
- Gemini: [GEMINI.md/import](https://geminicli.com/docs/cli/gemini-md/)、[Skills](https://geminicli.com/docs/cli/skills/)、[Subagents](https://geminicli.com/docs/core/subagents/)。.agents alias、activation、.gemini/agents定義に使用。

今回の実測結果は [検証記録](verification.md)。仕様の更新時は取得日と対応表を一緒に見直す。
