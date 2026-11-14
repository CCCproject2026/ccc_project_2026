---
name: nextjs-frontend
description: "Next.js画面・API連携・Server/Client境界・アクセシビリティを既存Web構成に沿って実装する。"
---

# nextjs-frontend

## 目的・使用場面

main/webのUI、取得処理、フォームや画面状態の変更。Next.js画面・API連携・Server/Client境界・アクセシビリティを既存Web構成に沿って実装する。

## 使用しない場面

Python推論のみ、Firmwareのみ、全体のセキュリティ監査のみ。

## 事前調査

リポジトリルート基準で `AGENTS.md` と main/web/package.json、main/web/pnpm-lock.yaml、対象main/web/src/app・main/web/src/features・main/web/src/shared、ESLint/Biome設定 を必要な範囲だけ読む。以下のパスはすべてリポジトリルート基準。情報が未確認なら推測せず記録する。

## 実行手順

1. 既存のserver/client境界とデータ取得を追跡する。
2. server-only、サーバー側認可、Zod検証を保ち、ローディング/空/失敗状態を設計する。API Routeでは `@/shared/lib/auth` の `requireStaff` / `requireRole`、ページでは `requireStaffPage` / `requireRolePage` を使い、Clerk認証だけでDB上の無効スタッフを許可しない。
3. JSON本文は `@/shared/lib/api-error` の `readJsonBody` で読む。既に `{ code, message }` 契約を使うAPI Routeでは `ApiError` と `errorResponse` を使う。`{ error }` を返す既存高齢者APIの形式は、このSkill変更で変えず、契約合意後に別Taskで扱う。Prismaは `@/shared/lib/prisma` を使う。
4. キーボード操作、ラベル、フォーカス、色以外の警告表現を確認する。
5. 最小差分で実装し、API担当との契約とReact Query等の既存状態管理を維持する。

## 成果物

画面差分、データ経路・認可境界の説明、操作検証記録

## 検証

pnpm lintと必要なbuild、表示/操作の正常・失敗ケース。Prisma schemaまたはmigrationを変更した場合は `pnpm prisma:validate` も実行し、migration作成の要否と結果を報告する。`pnpm biome:check` はCI必須ではない補助確認であり、既存の無関係な整形エラーをこのTaskで自動修正しない。既存テスト基盤がない場合は明記する。

## よくある失敗

Clerkログインだけで権限を判断する、Serverの秘密をClient propsへ渡す、画面不明状態を「正常」にする。

## 必要時の参照

検証コマンドは `docs/agent-coding/commands.md`、領域間契約の現状は `docs/agent-coding/investigation.md`、レビューと承認は `docs/agent-coding/workflow.md`。すべてを常時読み込まず対象Taskに必要なものだけ読む。
