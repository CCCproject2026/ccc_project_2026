# Web・認証・データベースの索引

回答では対象の route、service、schema を一緒に確認する。型やエラー形式を全APIで同じだと仮定しない。

## Webの責務分割

- `main/web/src/app/` は App Router のページ、layout、route handler の薄い入口。
- `main/web/src/features/<feature>/` は画面、client API、server service、schema を機能単位で置く。
- `main/web/src/shared/lib/auth.ts` の `getLoginUser` は Clerk の `userId` からDBの `User` を照会する。`requireStaff` と `requireRole` は、Clerkログインだけでなく `User.status === "ACTIVE"` とロールを確認する。
- ページ用の `requireStaffPage` / `requireRolePage` は redirect、API用の `requireStaff` / `requireRole` は `ApiError` を使う。用途を取り違えない。

## APIと外部境界

- route handler は `main/web/src/app/api/` にある。個別のHTTP method、入力、response、認可は対象の `route.ts` を読む。
- `GET /api/devices/by-code/{deviceCode}` は AI 側のDevice照会境界。`route.ts` が `requireDeviceToken` を先に呼び、`lookupDeviceByCode` が `{ device_code, status }` を返す。`device-token.ts` は専用Bearer tokenを比較するため、Clerkセッションで代替しない。
- Clerk webhook は `src/app/api/webhooks/clerk/route.ts`。スタッフ管理と招待の説明では、このrouteと `features/staff-management/server/` を確認する。

## DBの事実

`schema.prisma` のモデルは `User`、`Elder`、`Device`、`DeviceAssignment`、`ResponseRecord`、`ServerLog`。`DeviceAssignment` は利用者とデバイスの割当履歴、`ResponseRecord` は人間の対応記録である。MQTT入力だけで `ResponseRecord` が作成されるとは説明しない。

Prisma schema に表せない制約は `main/web/prisma/migrations/` のSQLにある。特に有効割当の部分一意index、期間・空contentのCHECK制約を説明するときはmigrationも読む。status enumとAIの接続状態を混同しない。

## 画面からDBまでを説明する順序

対象画面の `src/app/.../page.tsx` → featureの page/component/hook/API client → server service または route handler → `shared/lib/auth.ts` → Prisma query/schema の順で追う。たとえばダッシュボードは `features/dashboard/server/dashboard-service.ts` が認可後にRepeatable Read transactionで在籍者と件数を取得する。
