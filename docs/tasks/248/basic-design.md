# Basic Design — 基本設計

## Task情報

Issue #248: https://github.com/CCCproject2026/ccc_project_2026/issues/248

領域: Web。関連設計: `docs/basic_design/web_basic.md` の高齢者・デバイス管理。

## 目的・背景

`PATCH /api/elders/:id` の `status: "INACTIVE"` は、確認済みのデバイス割当を照合せず退所処理を実行していた。確認後に割当が変わった場合、別操作で作られた割当を終了しないようにする。

## 対象範囲・対象外

対象: PATCH / DELETE の退所時入力検証、退所トランザクションへの期待割当IDの伝播、競合時の 409。

対象外: Prisma schema・migration、React画面、既存の `{ error }` レスポンス形式、AI/IoT連携。

## システム構成・コンポーネント責務

Route Handler は看護師の認可・再認証・クエリ検証を担当し、`elder-service` はトランザクション内の更新を担当する。`assignment-service` は Device → Elder の順にロックし、現在の割当と期待値を照合する。

## データフロー・処理フロー

PATCH の `status: "INACTIVE"` は `expectedAssignmentId=<id>` または `expectedAssignmentId=none` を必須とする。再認証後、同じ期待値をトランザクションへ渡す。ロック後の有効割当と異なれば 409 を返しトランザクションを取り消す。一致すれば Elder を INACTIVE にし、必要なら割当終了と監査記録を同一トランザクションで作成する。

## 外部システムとの連携

外部システムへの新規連携はない。Clerk は既存の strict reverification を継続する。

## 非機能要件

既存のロック順・5秒 lock timeout・409/503 の扱いを維持する。Clerk認証だけでなく DB 上の ACTIVE NURSE をサーバー側で確認する。

## 制約・前提条件

高齢者 API の失敗本文は既存契約の `{ error: string }` を維持する。期待値を省略した退所は後方互換より競合安全性を優先して 400 とする。

## 未決事項・備考

画面の通常退所は既に DELETE と確認ダイアログを使う。PATCH は連携元・旧クライアントを含む API 経路の安全化を目的とする。


## web 固有項目

<!-- 共通の同名Templateに追加する項目。該当しない項目は理由を記載。 -->

### 画面・Routing

画面・Routingの変更はない。`src/app/api/elders/[id]/route.ts` の PATCH / DELETE を変更する。

### UI・Component構成

UI component の変更はない。サーバー実装は `elder-management/server` と既存 `device-management/server` の責務を維持する。

### 状態管理・データアクセス

クライアントへ秘密情報を渡さない。期待値は確認済み割当の識別子であり、Route Handler で検証後サーバー側だけで使用する。

### 画面の非機能要件

画面変更なし。Route Handler は `requireRole("NURSE")` と strict reverification を維持する。

