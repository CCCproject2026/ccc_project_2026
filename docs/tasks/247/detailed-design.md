# Detailed Design — 詳細設計

## Task情報・関連設計

Issue #247。基本設計: [basic-design.md](basic-design.md)。

## Module・Function

`sync.py` は各正本 `SKILL.md` と `references/` を読んで、4種類のツール用ディレクトリへ内容と生成マーカーを出力する。既存生成コピーとの差分だけを更新する。

## データ形式・Validation

正本の frontmatter は skill名とディレクトリ名が一致し、description はJSON文字列である必要がある。生成先はマーカーを含む管理済みファイルに限る。

## インターフェース

CLI: `--write` は同期、`--check` は差分を列挙して不一致時に終了コード1。外部APIは使用しない。

## 状態遷移

不一致 → 同期済み → check成功。未管理ファイル・シンボリックリンク・孤児生成物はエラーで停止し、書込みを行わない。

## Error・Exception handling

`--check` の MISSING OR STALE を確認してから `--write` を実行する。エラー時は対象を読んで正本または管理状態を修正し、強制上書きしない。

## Configuration・認証・認可

秘密値・認証情報は扱わない。生成器はリポジトリ内の管理対象ファイルだけを扱う。

## Logging・運用

標準出力は生成件数と不一致パスだけで、個人情報・秘密情報を出力しない。

## 未決事項・備考

ユーザー作成の未管理設定は変更しない。今回の変更は生成コピー17ファイルに限る。

