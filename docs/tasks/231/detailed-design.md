# Detailed Design — 詳細設計

## Task情報・関連設計

Issue: https://github.com/CCCproject2026/ccc_project_2026/issues/231
基本設計: [basic-design.md](basic-design.md)

## Module・Function

`sync.py` が生成する既存出力をそのまま追跡する。`.gitignore` は `.agents/skills/*/references/**` だけを再許可し、Skill正本の参照資料をGit管理対象にする。

## データ形式・Validation

生成ファイルはUTF-8、LF、末尾の生成器マーカーを既存形式のまま維持する。孤児生成物や未管理の手編集ファイルは既存の生成器に従いエラーとする。

## インターフェース

CLI契約は変更しない。`python3 scripts/agent-coding/sync.py --check` は全期待ファイルが一致すれば0、不足または差異があれば1を返す。

## 状態遷移

状態は「正本と生成物が一致」または「不足・差異あり」。`--write` は一致状態へ更新し、`--check` は状態を変更しない。

## Error・Exception handling

不一致は対象パスを表示して終了する。復旧は正本確認後に `--write` を実行し、生成結果をレビューしてGitに追加する。自動削除はしない。

## Configuration・認証・認可

新しい設定・認証情報は追加しない。`.agents` の個人設定・認証情報を再許可しない。

## Logging・運用

同期コマンドの標準出力を証跡とし、生成物に秘密値・実利用者データを含めない。

## 未決事項・備考

なし。
