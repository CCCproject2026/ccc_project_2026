# Detailed Design — データベース詳細設計

## 1. Task情報・関連設計

| 項目      | 内容                                                          |
| --------- | ------------------------------------------------------------- |
| Issue URL | https://github.com/CCCproject2026/ccc_project_2026/issues/166 |
| Task名    | 転倒検知支援システムのデータベース詳細設計                    |
| DB        | PostgreSQL                                                    |
| ORM       | Prisma                                                        |
| 配置      | EC2 #1：Application Server                                    |
| 基本設計  | [データベース基本設計](basic_design/database_basic.md)        |

本書は、基本設計で定義した次の6テーブルを実装可能な粒度で定義する。

```text
User
Elder
Device
DeviceAssignment
ResponseRecord
ServerLog
```

---

## 2. 物理設計共通方針

| 項目         | 方針                                              |
| ------------ | ------------------------------------------------- |
| 文字コード   | PostgreSQLのUTF-8                                 |
| 時刻         | `timestamp(3) with time zone` 相当。UTCで保存     |
| 内部ID       | Prismaの`String`と`cuid()`を使用                  |
| 論理削除     | User、Elder、Deviceはstatusで管理                 |
| 物理削除     | 原則として行わない                                |
| NULL         | 未確定、未登録、未使用の値だけ許可                |
| JSON         | ServerLog.payloadは`Json`型、PostgreSQLではJSONB  |
| 外部キー削除 | `RESTRICT`または`NO ACTION`。履歴を連鎖削除しない |

PostgreSQLの予約語や一般的な命名との衝突を避けるため、物理カラム名はPrismaのcamelCaseを基本とする。

---

## 3. Enum定義

```prisma
enum UserRole {
  CAREGIVER
  NURSE
}

enum UserStatus {
  PENDING
  ACTIVE
  INACTIVE
}

enum ElderStatus {
  ACTIVE
  INACTIVE
}

enum DeviceStatus {
  ACTIVE
  MAINTENANCE
  INACTIVE
}

enum ServerLogLevel {
  DEBUG
  INFO
  WARN
  ERROR
}
```

`ONLINE` / `OFFLINE` はAI側が判定する接続状態であり、DBの `DeviceStatus` には含めない。

---

## 4. テーブル詳細

### 4.1 User

スタッフの認証連携情報、個人情報、権限、利用状態を保持する。

| カラム        | PostgreSQL型     | NULL | 制約・用途                |
| ------------- | ---------------- | ---: | ------------------------- |
| `id`          | `text`           | 不可 | PK、内部ID                |
| `clerkUserId` | `text`           |   可 | UNIQUE、Clerk登録後に設定 |
| `firstName`   | `text`           | 不可 | 名                        |
| `lastName`    | `text`           | 不可 | 姓                        |
| `email`       | `text`           | 不可 | UNIQUE                    |
| `role`        | `UserRole`       | 不可 | CAREGIVER / NURSE         |
| `startDate`   | `date`           | 不可 | 利用開始日・入職日        |
| `endDate`     | `date`           |   可 | 利用終了日・退職日        |
| `dateOfBirth` | `date`           | 不可 | 生年月日                  |
| `nationality` | `text`           | 不可 | 国籍                      |
| `gender`      | `text`           | 不可 | 性別                      |
| `status`      | `UserStatus`     | 不可 | 初期値PENDING             |
| `createdAt`   | `timestamptz(3)` | 不可 | 初期値now()               |
| `updatedAt`   | `timestamptz(3)` | 不可 | 更新時に自動更新          |

### 4.2 Elder

高齢者の基本情報と在籍状態を保持する。

| カラム        | PostgreSQL型     | NULL | 制約・用途       |
| ------------- | ---------------- | ---: | ---------------- |
| `id`          | `text`           | 不可 | PK、内部ID       |
| `firstName`   | `text`           | 不可 | 名               |
| `lastName`    | `text`           | 不可 | 姓               |
| `roomNumber`  | `text`           | 不可 | 部屋番号         |
| `status`      | `ElderStatus`    | 不可 | 初期値ACTIVE     |
| `dateOfBirth` | `date`           | 不可 | 年齢算出元       |
| `gender`      | `text`           | 不可 | 性別             |
| `createdAt`   | `timestamptz(3)` | 不可 | 初期値now()      |
| `updatedAt`   | `timestamptz(3)` | 不可 | 更新時に自動更新 |

`age` は保存しない。表示時に `dateOfBirth` と表示日から算出する。

### 4.3 Device

IoTデバイスの内部ID、外部識別子、表示名、利用状態を保持する。

| カラム       | PostgreSQL型     | NULL | 制約・用途            |
| ------------ | ---------------- | ---: | --------------------- |
| `id`         | `text`           | 不可 | PK、内部ID            |
| `deviceCode` | `text`           | 不可 | UNIQUE、MACアドレス等 |
| `deviceName` | `text`           | 不可 | 表示名                |
| `status`     | `DeviceStatus`   | 不可 | 初期値ACTIVE          |
| `createdAt`  | `timestamptz(3)` | 不可 | 初期値now()           |
| `updatedAt`  | `timestamptz(3)` | 不可 | 更新時に自動更新      |

### 4.4 DeviceAssignment

高齢者とデバイスの割当期間を保持する。解除後も履歴として残す。

| カラム         | PostgreSQL型     | NULL | 制約・用途       |
| -------------- | ---------------- | ---: | ---------------- |
| `id`           | `text`           | 不可 | PK、内部ID       |
| `elderId`      | `text`           | 不可 | ElderへのFK      |
| `deviceId`     | `text`           | 不可 | DeviceへのFK     |
| `assignedAt`   | `timestamptz(3)` | 不可 | 割当開始時刻     |
| `unassignedAt` | `timestamptz(3)` |   可 | NULLは現在有効   |
| `createdAt`    | `timestamptz(3)` | 不可 | 初期値now()      |
| `updatedAt`    | `timestamptz(3)` | 不可 | 更新時に自動更新 |

制約：

- `assignedAt < unassignedAt`。`unassignedAt`がNULLの場合を除く。
- 有効な割当は、同一 `elderId` につき1件まで。
- 有効な割当は、同一 `deviceId` につき1件まで。
- 割当変更は旧割当の終了と新割当の作成を同一トランザクションで実行する。
- 高齢者またはデバイスがINACTIVEの場合、新しい割当を作成しない。

### 4.5 ResponseRecord

スタッフが高齢者への現場対応を完了した後に作成する対応記録を保持する。

| カラム              | PostgreSQL型     | NULL | 制約・用途         |
| ------------------- | ---------------- | ---: | ------------------ |
| `id`                | `text`           | 不可 | PK、内部ID         |
| `elderId`           | `text`           | 不可 | ElderへのFK        |
| `staffId`           | `text`           | 不可 | UserへのFK         |
| `content`           | `text`           | 不可 | 対応内容・メモ     |
| `isActualFall`      | `boolean`        | 不可 | 実際の転倒だったか |
| `responseStartedAt` | `timestamptz(3)` | 不可 | 対応開始日時       |
| `completedAt`       | `timestamptz(3)` | 不可 | 記録完了日時       |
| `createdAt`         | `timestamptz(3)` | 不可 | 初期値now()        |
| `updatedAt`         | `timestamptz(3)` | 不可 | 更新時に自動更新   |

Validation：

- `isActualFall`、`responseStartedAt`、`completedAt`を必須とする。
- `completedAt` は `responseStartedAt` 以降とする。
- `content` は空文字を許可しない。
- `staffId` はリクエスト値を信用せず、ログイン中のUserからサーバー側で設定する。
- `deviceId` は保持しない。

### 4.6 ServerLog

AI ServerやLog Workerの運用ログを、他テーブルとの関連なしに保持する。

| カラム       | PostgreSQL型     | NULL | 制約・用途                  |
| ------------ | ---------------- | ---: | --------------------------- |
| `id`         | `text`           | 不可 | PK、内部ID                  |
| `level`      | `ServerLogLevel` | 不可 | DEBUG / INFO / WARN / ERROR |
| `source`     | `text`           | 不可 | AI Server等                 |
| `message`    | `text`           | 不可 | ログメッセージ              |
| `occurredAt` | `timestamptz(3)` | 不可 | 発生日時                    |
| `receivedAt` | `timestamptz(3)` | 不可 | Log Worker受信日時          |
| `payload`    | `jsonb`          |   可 | 追加ログ情報                |
| `createdAt`  | `timestamptz(3)` | 不可 | DB保存日時                  |

ServerLogはUser、Elder、Device、DeviceAssignment、ResponseRecordへの外部キーを持たない。

---

## 5. Prismaモデル案

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String           @id @default(cuid())
  clerkUserId  String?          @unique
  firstName    String
  lastName     String
  email        String           @unique
  role         UserRole
  startDate    DateTime         @db.Date
  endDate      DateTime?        @db.Date
  dateOfBirth  DateTime         @db.Date
  nationality  String
  gender       String
  status       UserStatus       @default(PENDING)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  records      ResponseRecord[]

  @@index([status])
  @@index([role, status])
}

model Elder {
  id           String             @id @default(cuid())
  firstName    String
  lastName     String
  roomNumber   String
  status       ElderStatus        @default(ACTIVE)
  dateOfBirth  DateTime           @db.Date
  gender       String
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  assignments  DeviceAssignment[]
  records      ResponseRecord[]

  @@index([status])
  @@index([lastName, firstName])
}

model Device {
  id           String             @id @default(cuid())
  deviceCode   String             @unique
  deviceName   String
  status       DeviceStatus       @default(ACTIVE)
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  assignments  DeviceAssignment[]

  @@index([status])
}

model DeviceAssignment {
  id            String    @id @default(cuid())
  elderId       String
  deviceId      String
  assignedAt    DateTime
  unassignedAt  DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  elder         Elder     @relation(fields: [elderId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  device        Device    @relation(fields: [deviceId], references: [id], onDelete: Restrict, onUpdate: Cascade)

  @@index([elderId, assignedAt])
  @@index([deviceId, assignedAt])
  @@index([unassignedAt])
}

model ResponseRecord {
  id                  String             @id @default(cuid())
  elderId             String
  staffId             String
  content             String
  isActualFall        Boolean
  responseStartedAt   DateTime
  completedAt         DateTime
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  elder               Elder              @relation(fields: [elderId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  staff               User               @relation(fields: [staffId], references: [id], onDelete: Restrict, onUpdate: Cascade)

  @@index([elderId, createdAt])
  @@index([staffId, createdAt])
}

model ServerLog {
  id           String          @id @default(cuid())
  level        ServerLogLevel
  source       String
  message      String
  occurredAt   DateTime
  receivedAt   DateTime
  payload      Json?
  createdAt    DateTime        @default(now())

  @@index([source, occurredAt])
  @@index([level, occurredAt])
  @@index([createdAt])
}
```

---

## 6. Prismaで表現しにくいDB制約

次の制約はPrismaのモデル定義だけでは十分に表現できないため、マイグレーションSQLで追加する。

### 6.1 有効な割当の重複防止

```sql
CREATE UNIQUE INDEX device_assignment_active_elder_idx
ON "DeviceAssignment" ("elderId")
WHERE "unassignedAt" IS NULL;

CREATE UNIQUE INDEX device_assignment_active_device_idx
ON "DeviceAssignment" ("deviceId")
WHERE "unassignedAt" IS NULL;
```

### 6.2 割当期間

```sql
ALTER TABLE "DeviceAssignment"
ADD CONSTRAINT device_assignment_period_check
CHECK ("unassignedAt" IS NULL OR "assignedAt" < "unassignedAt");
```

### 6.3 ResponseRecordの入力制約

```sql
ALTER TABLE "ResponseRecord"
ADD CONSTRAINT response_record_time_check
CHECK ("responseStartedAt" <= "completedAt");
```

EnumのDB上の値はPrismaが生成する値に合わせる。マイグレーション実行前に既存データとの互換性を確認する。

---

## 7. トランザクション設計

### 7.1 デバイス割当変更

1. トランザクションを開始する。
2. ElderとDeviceを`ACTIVE`でロック付き取得する。
3. 現在有効な割当を取得する。
4. 既存割当があれば`unassignedAt`を設定する。
5. 新しいDeviceAssignmentを作成する。
6. トランザクションをコミットする。
7. 競合した場合は一意制約違反として扱い、利用者へ再読み込みを要求する。

同じElderまたはDeviceへの同時割当を、アプリケーションチェックとDBの一意インデックスの両方で防止する。

### 7.2 高齢者の無効化

Elderのstatus更新と、現在有効なDeviceAssignmentの終了を同じトランザクションで処理する。途中で失敗した場合は両方をロールバックする。

### 7.3 デバイスの故障・交換

Deviceのstatus変更、既存割当の終了、新デバイスの割当作成を、交換操作として実行する場合は同じトランザクションで処理する。単なる故障登録の場合はDeviceのstatusだけを変更する。

### 7.4 対応記録の保存

ResponseRecordはサーバー側で必須項目と日時をValidationし、1回のcreate操作で保存する。AI判定のMQTT受信処理からResponseRecordの保存処理は呼び出さない。

---

## 8. インデックス方針

| 対象                                  | 目的                   |
| ------------------------------------- | ---------------------- |
| User.status                           | 有効スタッフ一覧       |
| User.role, status                     | NURSE等の権限確認      |
| Elder.status                          | 在籍中高齢者一覧       |
| Elder.lastName, firstName             | 高齢者検索             |
| Device.status                         | 利用可能デバイス一覧   |
| DeviceAssignment.elderId, assignedAt  | 高齢者の割当履歴       |
| DeviceAssignment.deviceId, assignedAt | デバイスの割当履歴     |
| ResponseRecord.elderId, createdAt     | 高齢者別の投稿一覧     |
| ResponseRecord.createdAt              | 対応記録の時系列取得   |
| ServerLog.source, occurredAt          | 発生元・日時による調査 |
| ServerLog.level, occurredAt           | ログレベルによる調査   |

部分一意インデックスはPrismaの`@@unique`では表現できないため、マイグレーションSQLで管理する。

---

## 9. API・保存責任

| 操作                     | 実行コンポーネント    | DB書き込み                   |
| ------------------------ | --------------------- | ---------------------------- |
| Clerkユーザー同期        | Next.js Web API       | User upsert                  |
| スタッフ状態・ロール変更 | Next.js Web API       | User update                  |
| 高齢者管理               | Next.js Web API       | Elder create/update          |
| デバイス管理             | Next.js Web API       | Device create/update         |
| デバイス割当・解除       | Next.js Web API       | DeviceAssignment transaction |
| 対応記録投稿             | Next.js Web API       | ResponseRecord create        |
| 対応記録一覧取得         | Next.js Web API       | ResponseRecord select        |
| AI運用ログ保存           | Log Worker            | ServerLog create             |
| 転倒判定の画面表示       | MQTT Broker / Browser | DB書き込みなし               |

AI ServerとブラウザはPostgreSQLへ直接接続しない。

---

## 10. エラー処理

| エラー                     | 処理                                                             |
| -------------------------- | ---------------------------------------------------------------- |
| UNIQUE制約違反             | 409相当を返し、入力内容を維持して再試行可能にする                |
| 外部キー制約違反           | 400相当として対象データの再取得を要求する                        |
| ResponseRecordの入力不整合 | Validationエラーとして保存しない                                 |
| 割当競合                   | トランザクションをロールバックし、最新状態を表示する             |
| DB接続・タイムアウト       | 成功扱いにせず、サーバーログへ記録する                           |
| Log Worker保存失敗         | 再試行対象として記録し、受信処理と保存処理の結果を分けて監視する |

---

## 11. マイグレーション・運用

- Prisma migrationを使用してスキーマ変更を管理する。
- 本番環境では`prisma db push`ではなく、レビュー済みのmigrationを適用する。
- Enum値を削除・変更する場合は、既存データの変換を先に行う。
- 部分一意インデックスとCHECK制約はmigration SQLで管理する。
- 既存の`FallLog`が存在する環境では、削除前に移行要否を確認する。
- バックアップ、保存期間、復旧手順はインフラ設計に従う。

---

## 12. 未決事項

| 事項                                    | 確認先               | 決定時期               |
| --------------------------------------- | -------------------- | ---------------------- |
| `gender`、`nationality`の許容値         | Web・DB担当          | 実装前                 |
| 投稿の訂正・削除ルール                  | Web・DB担当          | API詳細設計前          |
| ServerLogの保存期間とローテーション     | DB・インフラ担当     | 運用設計時             |
| ServerLogの重複識別・再試行方式         | AI・DB・インフラ担当 | Log Worker実装前       |
| 既存FallLogの移行・廃止方法             | Web・DB担当          | migration作成前        |
| 部分一意インデックスのmigration適用方法 | DB担当               | Prisma migration作成時 |

---

## 13. 変更履歴

| 版  | 日付       | 内容                                                          |
| --- | ---------- | ------------------------------------------------------------- |
| 1.0 | 2026-09-23 | 6テーブルの物理型、制約、Prismaモデル、トランザクションを定義 |
