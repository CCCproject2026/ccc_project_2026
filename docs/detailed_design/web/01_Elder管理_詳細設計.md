# 01 Elder管理 詳細設計

作成日: 2026-10-07 ／ 状態: レビュー用（基本設計のプロトタイプ未定項目あり）

| 表記 | 意味 |
|---|---|
| 確定前提 | Issue #181・既存資料が指定した要件 |
| 設計方針 | 本書で提案する内部実装の方針 |
| `[TBD]` | 未合意の外部仕様・運用値。実装前に要確定 |
| 確認事項 | 既存資料の差異・実物との照合が必要 |

## 1. Task情報・関連設計

| 項目 | 内容 |
|---|---|
| Issue | [#181 高齢者管理機能 詳細設計](https://github.com/CCCproject2026/ccc_project_2026/issues/181) |
| 基本設計（参照） | [Web基本設計](../../basic_design/web_basic.md), [全体概要](../../basic_design/overview.md) |
| 基本設計（DB） | `main/web/prisma/schema.prisma`（Elder / DeviceAssignment） |
| 既存機能 | `src/features/staff-management/`, `src/features/device-management/`（UI 構造の雛形） |
| 関連Issue | #126（DB設計）, #183（AI server 詳細設計） |

## 2. Module・Function

対象は Elder の在籍情報の登録・一覧・詳細・編集・論理削除と、Elder への Device 割当の作成・解除である。

対象外: Clerk認証・招待（Staff管理機能）、Fall検知・アラーム通知（Response/アラート機能）、デバイス台帳の管理（Device管理機能）、申し送り・対応記録の閲覧（個別画面の責務）。

### Module Responsibility

| Module | Responsibility | Input | Output | Dependency |
|---|---|---|---|---|
| `app/(authenticated)/elders/page.tsx` | 一覧ページのルート | なし | Page | `ElderManagementPage` |
| `features/elder-management/pages/ElderManagementPage.tsx` | 一覧・登録・編集・論理削除の画面状態 | ルート | React要素 | components, types, API client |
| `components/ElderTable.tsx` | Elder 一覧表示 | `ElderRow[]`, onEdit, onDelete | React要素 | なし |
| `components/AddElderModal.tsx` / `EditElderModal.tsx` | 登録/編集フォーム | open, onSubmit | フォーム入力値 | `FormField`, `Modal` |
| `components/ElderSummaryCards.tsx` | 在籍数サマリ | 集計値 | React要素 | なし |
| `components/DeviceAssignModal.tsx` | Device 割当/解除 | `ElderRow`, deviceList | 割当要求 | API client |
| `api/elders.ts` | Route Handler 呼出し | 入力型 | Promise | fetch client |
| `app/api/elders/route.ts` | GET一覧 / POST登録 | Request | Response | Prisma, Clerk |
| `app/api/elders/[id]/route.ts` | GET詳細 / PATCH更新 / DELETE無効化 | Request | Response | Prisma, Clerk |
| `app/api/elders/[id]/assignment/route.ts` | POST割当 / DELETE解除 | Request | Response | Prisma, Clerk |
| `lib/elders-db.ts` | Prisma CRUD ラッパ（transaction含む） | 型付き入力 | 型付き結果 | PrismaClient |

## 3. フォーム機能・ボタン明確化（Issue #181 指摘事項）

> これが Issue #181 で指摘された「投入する form・機能・button を明確化」の答え。
> StaffManagementPage / device-management の UI パターン（StaffTable + AddStaffModal）に揃える。

### 3.1 登録フォーム（AddElderModal）

| フォーム項目 | 型 | 必須 | Validation |
|---|---|---|---|
| lastName | string | 必須 | 1文字以上50文字以内 |
| firstName | string | 必須 | 1文字以上50文字以内 |
| roomNumber | string | 必須 | 1文字以上20文字以内 |
| dateOfBirth | date | 必須 | 日付形式、年齢0〜130歳、未来日不可 |
| gender | enum/string | 必須 | `[TBD]` 候補: male / female / other / prefer-not-to-say |
| deviceId（任意） | string | 任意 | 未割当時は空。既存 Device の id のみ |

### 3.2 ボタン一覧

| 場所 | ボタン | 動作 |
|---|---|---|
| 一覧ヘッダ | 「高齢者を追加」 | AddElderModal を開く |
| 一覧行 | 「編集」 | EditElderModal（既存値を初期値） |
| 一覧行 | 「退所・無効化」 | 確認ダイアログ → status を INACTIVE に |
| 一覧行 | 「割当」 | DeviceAssignModal（デバイス選択・解除） |
| 登録/編集モーダル | 「保存」 | バリデーション → POST/PATCH |
| 登録/編集モーダル | 「キャンセル」 | モーダルを閉じフォームをリセット |

### 3.3 Page・Component 状態

`StaffManagementPage` と同じパターンで、一覧・モーダル開閉・サマリ・削除確認を扱う。

- `loading`: 一覧取得中のスケルトン表示
- `empty`: 登録0件時の空状態メッセージ + 「高齢者を追加」ボタン
- `error`: 取得失敗時のエラーメッセージ + 「再読み込み」ボタン

## 4. データ形式・Validation

### Elder（prisma）

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| id | String(cuid) | PK | サーバー側生成 |
| firstName | String | NOT NULL | 表示・検索用 |
| lastName | String | NOT NULL | 表示・検索用 |
| roomNumber | String | NOT NULL | 駆けつけるための部屋番号 |
| status | ElderStatus | ACTIVE / INACTIVE, default ACTIVE | 物理削除しない |
| dateOfBirth | Date (Date) | NOT NULL | 年齢は表示時に算出 |
| gender | String | NOT NULL | `[TBD]` |
| createdAt | timestamptz | default now | |
| updatedAt | timestamptz | @updatedAt | |

### API 入出力型（案）

```ts
type CreateElderInput = {
  firstName: string; lastName: string; roomNumber: string;
  dateOfBirth: string; // ISO date
  gender: string;
  initialDeviceId?: string;
};
type UpdateElderInput = Partial<{
  firstName: string; lastName: string; roomNumber: string;
  dateOfBirth: string; gender: string;
  status: "ACTIVE" | "INACTIVE";
}>;
```

## 5. インターフェース（API 契約）

| Method | Path | Request | Response | 正常 / 異常 |
|---|---|---|---|---|
| GET | `/api/elders` | `?status=&q=` | `ElderRow[]` | 200 / 401 未認証, 500 |
| POST | `/api/elders` | `CreateElderInput` | 作成された `Elder` | 201 / 400 Validation, 401, 409, 500 |
| GET | `/api/elders/[id]` | なし | `Elder` + 現在の割当 | 200 / 404 |
| PATCH | `/api/elders/[id]` | `UpdateElderInput` | 更新後 `Elder` | 200 / 400, 404 |
| DELETE | `/api/elders/[id]` | なし | `204` | status=INACTIVE に論理削除 / 404 |
| POST | `/api/elders/[id]/assignment` | `{ deviceId }` | 割当レコード | 201 / 400, 404, 409（既に別 Elder に割当中） |
| DELETE | `/api/elders/[id]/assignment` | なし | `204` | unassignedAt を設定 / 404 |

### 5.1 Route Handler 実装方針

- Next.js App Router Route Handler で実装（`src/app/api/elders/...`）
- Clerk middleware で認証通過後、サーバー側でセッション/ロール確認
- Prisma 経由で PostgreSQL（RDS）にアクセス。割当変更は旧割当の終了と新割当の作成を 1 トランザクションで実行

## 6. 状態遷移

### Elder.status

```text
ACTIVE ──(退所・無効化: DELETE)──▶ INACTIVE
INACTIVE ──(復帰処理 PATCH status=ACTIVE)──▶ ACTIVE （運用上の再開は要協議）
```

### DeviceAssignment（現在有効な割当 = unassignedAt IS NULL）

```text
未割当 ──(POST assignment)──▶ 割当中(unassignedAt=NULL)
割当中 ──(DELETE assignment)──▶ 解除(unassignedAt=now())
割当中 ──(別Deviceへ付替)──▶ 旧解除 + 新割当（1トランザクション）
```

## 7. Error・Exception handling

| ケース | 検出条件 | 通知・復旧 |
|---|---|---|
| バリデーションエラー | zod/schema で検証失敗 | 400 + フィールド単位のエラーメッセージをフォームに表示 |
| 未認証 | セッション切れ・未ログイン | 401→ログイン画面へリダイレクト |
| 権限不足 | Staff 管理以外は NURSE 限定操作 | 403、NURSE のみ登録/無効化可 |
| 対象なし | id 不在 | 404 + 「データが見つかりません」 |
| 割当競合 | 同じ Device が別 Elder に ACTIVE | 409、「そのデバイスは割当済みです」 |
| 通信/DBエラー | Prisma 接続失敗 | 500。画面は「再読み込み」を提示。詳細はサーバーログに出力 |

## 8. Configuration・認証・認可

- `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` を参照（秘密値は書かない）
- 認可: 高齢者の閲覧は全ロール可。登録・編集・無効化・割当変更は NURSE（管理者）のみ許可
- Webhook検証: Staff招待用 webhook のみ（Clerk検証）。Elder API には直接適用しない

## 9. Logging・運用

- サーバー関数の入口/出口とエラーを構造化ログ（JSON）で出力
- Elder の氏名・部屋番号・生年月日は個人情報のため、ログに平文で出さない（idのみ）
- 割当変更は `unassignedAt` / `createdAt` タイムスタンプで履歴照合可能

## 10. データベース・Prisma 詳細

- `Elder`: 詳細は §4
- `DeviceAssignment`: `elderId`, `deviceId`, `assignedAt`, `unassignedAt`, indices
- 物理削除はしない（status/論理削除）、FK は RESTRICT
- ERD: `pnpm prisma:erd` で `prisma/ERD.md` を生成

### 10.1 リアルタイム通信・ブラウザ動作

- 本機能の一覧/詳細は初回 fetch + 操作後の再取得。リアルタイム更新（WebSocket/SSE）は対象外（Dashboard の alarm 通知を参照）
- モーダルのフォーム送信中は保存ボタンを disabled + 「保存中…」表示
- ブラウザ戻る/キャッシュ： Next.js App Router の標準動作に従う。詳細画面から戻った際は一覧を再取得

## 11. 未決事項・備考

| 項目 | 未決 |
|---|---|
| gender の選択肢 | male/female/other/prefer-not-to-say の確定 |
| 部屋番号の粒度 | 1Elder=1部屋か、複数対応可か |
| 割当解除デフォルト時刻 | 解除時刻 = 実行時刻でよいか |
| INACTIVE Elder の復帰 | 運用要件確認 |
| プロトタイプUIとの差分 | 他機能（Device/Staff/Dashboard）のUI確定後にフォーム・ボタンを横展開 |

## 12. 完了条件（Task）

1. 本書がレビューで承認される
2. Frontend 実装タスク（UI・フォーム・API連携）を別Issueとして切り出す
3. Backend 実装タスク（API・Prisma・トランザクション）を別Issueとして切り出す
