# 最終報告・技術解説

## 1. 変更内容

以前は共通Agent指示・Skill・専門Roleがなく、.agents/.codexも一括Git除外されていた。今回、共通AGENTS、4ツールの入口/専門Agent、3 Role、7 Skill、生成と検査、チームガイドを追加した。既存変更は .gitignore の共有定義例外とREADMEの入口リンクだけ。アプリ・DB・依存・モデル・CIは変更していない。

調査範囲はGit/README/既存開発手順、package.json/lockfiles、Python依存、Compose/Docker/CI、HTTP/MQTT入力、前処理/推論、Prisma schema/migrations、環境変数のキーと認可実装。現行はMQTT入力であり、READMEのHTTP/画像CNNと差がある。連続Window→推論→結果配信は未接続。詳細は [調査レポート](investigation.md)。

## 2. なぜ必要だったのか

ツールごとに別々の長い規則を書くと、変更時に規則が食い違う。特に単位・軸・認証・モデル互換性の未確認事項を確定済みと誤解すると、領域をまたぐ障害につながる。共通規則と必要時に読む手順を分け、実装根拠・未合意・検証証拠をチーム全体で共有する構成にした。

## 3. 処理の仕組み

CodexはAGENTS、Claude/Geminiは専用入口からAGENTSをimportし、Copilotには共通AGENTSの明示readを指示する。Skillは名前/説明で探索され、選択時に本文を読む。各専門Agentは共通Roleを明示readする。各ツールの探索/呼出と例外は [対応表](tool-support.md) に公式出典付きで記録した。

`scripts/agent-coding/sync.py` の `expected_files()` が正本SkillとRole adapterから33件の期待内容を組み立てる。`main()` は余剰生成物・symlink・未管理ファイルの衝突を検査してから書き込む。`--check` は不足/変更/余剰を失敗として報告する。削除正本の古いSkillが探索され続ける問題を防ぐため、余剰は自動削除せずレビューを求める。

## 4. 設計判断

共通AGENTSに全手順を詰め込む方法は単純だが毎回不要な内容まで読む。各ツールに手でコピーする方法は更新がずれる。今回はAGENTSを短く保ち、正本Skill/Roleと生成物を分けた。Symlinkはコピーが減る一方、OS/checkout/clientの差があるため通常ファイルの生成を採用した。追加Python依存はなく、標準ライブラリで生成/検査する。Python 3.11以上が必要。

ネイティブAgentは用意するが、ツール間で同一の権限/並列実行を保証しない。未対応clientはRoleを明示readし、独立レビューは別セッションまたは人間で行う。

## 5. 重要な技術概念

- **Progressive Disclosure**: 必要になった時だけ詳細を読む。Skillのdescriptionが入口で、本文が具体的な手順、既存契約が詳細な証拠になる。
- **認証と認可**: 誰かを確認することと、その操作を許すことは別。実コードの `main/web/src/shared/lib/auth.ts` はClerkだけでなくスタッフのDB状態を確認する。Device APIは専用Bearer境界である。
- **通信バッチと推論Window**: `sensor_json.py` の1〜100点の受信と、モデルに渡す連続100点は別の概念。Bufferが未実装なら入力受理を推論完了とは呼べない。
- **同期の完全性**: `sync.py` は期待内容との一致だけでなく、消した正本に対応する余剰コピーも検出する。探索される古い規則を残さないためである。

## 6. 失敗ケースとリスク

独立レビューで、入れ子の個人設定がGit対象になる問題、root基準の参照パス不足、削除Skillの旧コピーが検査を通る問題を発見・修正した。再レビューでは新規指摘なし。

指示はアクセス制御の代替ではない。個人/組織設定、workspace trust、ツール版により読込は変わる。Claude未導入、全ツールのLLM付きnative Agent選択、実機/モデル互換性、外部AIへの機密情報取扱規則は未解決。担当/完了条件は [利用ガイド](README.md) に整理した。

## 7. 検証結果

- `python3 scripts/agent-coding/sync.py --check`: 33件一致。
- `python3 -m unittest discover -s scripts/agent-coding -p 'test_*.py' -v`: 安全性テスト4件成功。
- `git diff --check`、文書リンク、共有/個人設定のGitignore、アプリ無変更: 成功。
- Codex独立子Agent: AGENTS自動注入、7 Skill metadata発見、code-review本文readとレビュー適用を確認。
- Copilot CLI 1.0.107: instruction/skill listで指示候補と7 Skillを確認。LLM適用は未実行。
- Gemini CLI 0.68.0: 一時設定領域と限定trustで7 Skillを確認。通常設定での一覧は応答せず中断。
- Claude: 未導入で未実行。skill-creatorのPython検査はPyYAML不足で失敗、代替のGemini配布validatorは7正本すべてvalid。

完全な全ツール統合成功とは報告しない。実行コマンド・失敗理由・再現方法・独立レビューは [検証記録](verification.md) に記載した。

## 8. 学習ポイント・日常の使い方

1. コード・設定・合意文書・実機の観測を区別する。設定が50Hzでも実機が50Hzで動く証明にはならない。
2. 同じ規則の正本を一つにし、生成物の不足・変更・余剰を検査する。
3. Skillの発見、本文読込、挙動への適用、独立Agentの実行は別々に確認する。
4. 自己レビューと独立レビューの両方を使い、検証できていない範囲を正直に残す。

日々はIssue/受入条件→対象Skill/Role→既存設計テンプレート→小さな実装→検証→独立レビュー→人間承認。サンプルプロンプトは [日本語ガイド](README.md)。Merge/Deploy等は今回実行していない。

## 完成した構成

`<7 skills>` は下記7正本と同じ名前のディレクトリ、`<3 roles>` は下記3 Roleと同じslug。生成物は通常ファイルで、clone後の生成作業は不要。

```text
.
├── AGENTS.md
├── CLAUDE.md
├── GEMINI.md
├── .agents/skills/<7 skills>/SKILL.md
├── .claude/
│   ├── agents/<3 roles>.md
│   └── skills/<7 skills>/SKILL.md
├── .codex/agents/<3 roles>.toml
├── .gemini/agents/<3 roles>.md
├── .github/
│   ├── copilot-instructions.md
│   ├── agents/<3 roles>.agent.md
│   └── skills/<7 skills>/SKILL.md
├── docs/agent-coding/
│   ├── README.md
│   ├── investigation.md
│   ├── design.md
│   ├── commands.md
│   ├── workflow.md
│   ├── tool-support.md
│   ├── verification.md
│   ├── report.md
│   ├── roles/
│   │   ├── nextjs-specialist.md
│   │   ├── python-ml-iot-specialist.md
│   │   └── senior-code-reviewer.md
│   └── skills/
│       ├── nextjs-frontend/SKILL.md
│       ├── fastapi-ml-iot/SKILL.md
│       ├── iot-data-contract/SKILL.md
│       ├── code-review/SKILL.md
│       ├── learning-oriented-explanation/SKILL.md
│       ├── testing-and-verification/SKILL.md
│       └── security-and-privacy/SKILL.md
└── scripts/agent-coding/
    ├── sync.py
    └── test_sync.py
```

既存READMEには案内リンク、.gitignoreには共有設定の例外を追加。設定の配布は通常のPRレビューとGit運用に従う。
