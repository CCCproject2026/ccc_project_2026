# Agent環境の検証記録

実施日: 2026-11-13。リポジトリルートで実施。実アプリ・DB・Brokerへの接続、モデルdeserialize、クラウド変更、commit/push/merge/deployは未実施。

## 実機で確認できたこと

| AIツール | 確認バージョン | 指示の自動読込 | Skillの発見/本文/明示呼出 | 専門Agent | 結果・限界 |
|---|---|---|---|---|---|
| Claude Code | `command -v claude` で未検出 | 未実行 | 未実行 | 定義のみ、呼出未実行 | CLI未導入。公式配置と静的検査のみ |
| Codex | CLI 0.167.0-alpha.4.1（レビューは現在のCodex環境） | 新規独立子Agentの開始コンテキストにAGENTS全文が注入された | 7件のmetadataを発見。Reviewerがcode-review本文を明示readして適用 | 独立子Agentレビュー実施。ただし `.codex/agents/*.toml` の名前によるネイティブ選択は未実行 | CLI版と現在のホストを同一視しない。全Skillの自動選択/明示UI呼出は未検証 |
| GitHub Copilot | CLI 1.0.107 | instruction listでAGENTSとadapter候補を発見。LLMへの適用は未検証 | skill listで7件Enabled、.github/skillsを選択。本文activationは未実行 | TOML以外は静的確認、Custom Agent呼出未実行 | IDE/cloudは未検証。CLIの発見を全製品の成功としない |
| Gemini CLI | 0.68.0 | GEMINI importの実セッション表示は未実行 | 隔離した設定領域と当該rootだけのtrustで7件Enabled、.agents/skillsから発見 | 定義の一覧呼出/委任は未実行 | 通常設定のlistは応答なしで中断。隔離設定の発見成功は個人環境全体の成功ではない |

独立子Agentは新しいAGENTS/Skillsを自動的に受け取ったと報告し、実際にcode-review本文を読み取りレビューした。これはCodexホストの発見・読込・適用の観測であり、4ツールすべての完全な統合試験ではない。

Claude導入、全ツールのLLM付きの明示呼出、Copilot IDE/cloud、Gemini memory表示と各native Agent委任は [確認プロンプト](tool-support.md) で各メンバーが確認する。外部AIへのコード取扱規則が未確認のため、別サービスへこのリポジトリを送る追加のLLMセッションは起動していない。

## 実行コマンドと結果

| コマンド/検査 | 結果 |
|---|---|
| `git rev-parse --show-toplevel` / `git status --short` | 成功。開始時差分なし、root確認 |
| `codex --version` / `gemini --version` / `copilot --version` | 上記バージョン。Codexはsandbox内PATH alias作成の警告あり、version取得成功 |
| `python3 scripts/agent-coding/sync.py --write` | 初回sandboxでは保護された .agents 作成で失敗。許可された実行で33件生成。以降は修正差分だけ同期 |
| `python3 scripts/agent-coding/sync.py --check` | 成功、33生成ファイルが正本と一致、Codex TOML parse成功 |
| `python3 -m unittest discover -s scripts/agent-coding -p 'test_*.py' -v` | 成功、4件。生成/一致/差分、非管理ファイル保護、削除正本の残存コピー検出、symlink先への書込拒否。すべて一時checkoutで実施 |
| `git diff --check` | 成功。未追跡ファイルの内容は別途レビュー |
| `git check-ignore`（共有定義と個人設定の候補） | .agents/skills・.codex/agents等は共有可能、.codex/auth.json・.claude/settings.local.json・.gemini/settings.json・入れ子の.codex/.agents・.envは除外。非除外確認のexit 1は期待値 |
| skill-creatorの `quick_validate.py` を7正本に実行 | 失敗、Python環境にPyYAMLなし。Skill不正と確定する失敗ではない。依存は追加しない |
| Gemini配布の `validate_skill.cjs` のvalidateSkillを7正本に実行 | 成功、7件valid。frontmatter/name/description等の静的検証でありLLM挙動の証明ではない |
| `copilot --no-auto-update instruction list --json` | 成功。AGENTS.md、.github/copilot-instructions.md、CLAUDE.md、GEMINI.mdを候補表示。各import処理の証明ではない |
| `copilot --no-auto-update skill list --json` | 成功、7 project skills Enabled、同名コピーは.github配下のものを表示 |
| `gemini skills list`（通常設定） | 応答なし、終了コード130で中断。原因未特定 |
| `GEMINI_CLI_HOME=/tmp/ccc-agent-gemini-probe gemini skills list` | exit 0だがuntrusted、No skills discovered。成功扱いにしない |
| 同じ隔離home + `GEMINI_CLI_TRUSTED_FOLDERS_PATH=/tmp/ccc-agent-gemini-probe/trustedFolders.json` で `gemini skills list` | exit 0、7件Enabled。trust JSONはこのリポジトリ絶対パスのみTRUST_FOLDER。通常の個人trust設定は変更なし。Ripgrep fallback警告あり |
| Markdown相対リンク検査 | 最終ファイル作成後に確認。コマンド本文は下記 |
| Web lint/build・AI実推論・実機/E2E | 未実行。アプリ変更なし、設定検証の対象外 |

Geminiの隔離確認は認証不要のローカル探索であり、trust全体を無効化したものではない。個人環境の停止原因は拡張/設定/接続等を追加調査する必要がある。通常環境の設定を書き換えて解決したとは主張しない。

## 再実行できる静的確認

```sh
python3 scripts/agent-coding/sync.py --check
python3 -m unittest discover -s scripts/agent-coding -p 'test_*.py' -v
git diff --check
copilot --no-auto-update instruction list --json
copilot --no-auto-update skill list --json
```

リンク検査（Python標準ライブラリのみ）:

```python
from pathlib import Path
import re
files = [Path('AGENTS.md'), Path('CLAUDE.md'), Path('GEMINI.md'),
         Path('.github/copilot-instructions.md'), *Path('docs/agent-coding').rglob('*.md')]
errors = []
for file in files:
    for link in re.findall(r'\]\(([^)]+)\)', file.read_text()):
        if '://' not in link and not link.startswith('#'):
            if not (file.parent / link.split('#')[0]).exists():
                errors.append((str(file), link))
assert not errors, errors
print('PASS', len(files), 'Markdown files')
```

## 独立レビューと修正

独立したSenior Code Reviewerが未コミット差分・新規ファイルを読み取りレビュー。実装者の説明だけでは判断せず、3件のMedium指摘を報告した。

| 初回指摘 | 障害シナリオ・推奨修正 | 対応・学習ポイント |
|---|---|---|
| .gitignore:79、root固定除外への変更 | 入れ子の個人設定がcommit候補になる。全階層除外を保持しroot共有定義だけ例外化 | 修正。先頭/は適用範囲を変える。check-ignoreで再確認 |
| fastapi-ml-iot/SKILL.md:18等、root基準宣言と短縮パスの不一致 | 必須調査先が読めず契約確認が抜ける。main/ai・main/webを明示 | Skill/Role参照を修正、再生成。再利用手順の参照はCWDに依存させない |
| sync.py:63（初回位置）、期待ファイルだけの照合 | 正本削除後も旧Skillが残りAIが発見する。余剰の管理ファイルを検出して停止 | orphan検出を追加し、自動削除なし。削除ケースを独立した一時環境テストで確認 |

修正後の再レビュー結果は下記追記を参照。対象外: アプリ全体の不具合監査、外部サービス、全ツールのモデル呼出。

### 再レビュー結果

同じ独立Reviewerが修正後を再確認し、初回3件すべて解消、新たな指摘なしと報告。sync --check（33件）、入れ子/共有のGitignore、参照パス、削除正本の残存3コピーを拒否するシミュレーションを独立に確認した。4テストは実装担当が再実行して全件成功、Reviewerはテスト内容を確認したが再実行していない。

最終リンク検査は21 Markdownファイルで成功。アプリソース無変更、共有設定のGit可視性と個人設定の除外も成功した。最終報告追加後のリンク再検査は22ファイルを対象とする。
