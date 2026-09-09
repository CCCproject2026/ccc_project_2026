# Basic Design — 基本設計

## Task情報
- **Issue URL**:[ https://github.com/CCCproject2026/ccc_project_2026/116](https://github.com/CCCproject2026/ccc_project_2026/issues/166)
- **Task名**: Webシステム基本設計書の作成
- **領域**: Web (Frontend / API Layer / Database)
- **担当者**: Kyi Pyar Hlaing
- **関連設計**: AI推論サーバーIF設計, DBスキーマ設計 (Prisma)

---

## 1. 目的・背景

本システムは、高齢者の転倒検知と迅速な対応を支援するためのWebシステムである。

主な目的は以下の通りである。

- 高齢者の在籍情報、デバイス情報、アラート情報を一元管理する
- IoTセンサーとAI推論結果を受け取り、アラートを発生させる
- 看護師・介護士・管理者が状態を確認し、対応に素早く移れるようにする
- 認証・ロール管理・通知機能を通じて、適切な権限で運用できるようにする

本Webシステムは、AI推論サーバーと連携して転倒アラームを受信し、ダッシュボードに可視化する役割を担う。

---

## 2. 対象範囲・対象外

### 2.1 対象範囲

- ユーザー認証と権限管理（Clerk連携）
- 看護師・介護士・管理者向けのUI
- 高齢者情報の管理
- デバイス割当管理
- 転倒アラート表示と対応履歴管理
- Prismaベースのデータ永続化
- AI推論サーバーからのアラート受信
- Webhookによるユーザー同期

### 2.2 対象外

- IoTデバイス本体のハードウェア設計
- AIモデルの学習・評価・再学習
- 3Dモニタリングや外部通知基盤（SMS/電話連携）の本実装
- 監査ログの高度な分析基盤
- 大規模データ分析基盤の構築

---

## 3. システム構成・コンポーネント責務

### 3.1 全体構成

```text
IoT Device
  ↓ (sensor data)
AI Inference Server (FastAPI / Python)
  ↓ (fall result JSON)
Next.js Web App
  ├─ Frontend (React / Next.js App Router)
  ├─ API Routes
  ├─ Clerk Authentication
  ├─ Prisma Client
  └─ PostgreSQL Database
  ↓
Dashboard / Staff Management / Device Management
```

### 3.2 コンポーネント責務

#### 3.2.1 Frontend (Next.js)
- **担当**:Kyi Pyar Hlaing
- ログイン画面の表示
- ダッシュボード表示
- 高齢者一覧とアラート表示
- 看護師・管理者向けの操作画面
- アラートへの応答操作
- デバイス管理画面

#### 3.2.2 API Layer
- **担当**:Kyi Pyar Hlaing + バックエンド連携
- AIサーバーからのアラート受信
- Webhook処理の受信
- PrismaへのCRUD処理
- 権限ごとの画面/処理制御

#### 3.2.3 Authentication (Clerk)
- **担当**: Kyi Pyar Hlaing
- ログイン・ログアウト
- 招待ユーザー登録
- ロール情報の管理
- Webhookでのユーザー同期

#### 3.2.4 Database (PostgreSQL + Prisma)
- **担当**: Web担当者 / DB設計
- ユーザー情報保持
- 高齢者情報保持
- デバイスと割当の管理
- 転倒アラートの履歴管理
- 情報の永続化と検索

#### 3.2.5 AI Communication
- **担当**: AI担当者 + Web担当者
- センサーからの時系列データ解析
- 推論結果のJSON出力
- アラート通知の送信先確定

---

## 4. ユーザーと権限設計

### 4.1 役割

| Role | 役割 | 主な権限 |
| --- | --- | --- |
| CAREGIVER | 介護士 | 高齢者状態確認、応答記録 |
| NURSE | 看護師 | アラート確認、対応、履歴管理 |
| ADMIN | 管理者 | ユーザー管理、ロール変更、デバイス管理 |

### 4.2 権限方針

- 一般スタッフは自身の対応範囲のデータのみ閲覧可能
- 看護師はアラート照会と対応履歴の閲覧が可能
- 管理者はユーザー招待、ロール更新、デバイス割当を実施可能
- API レベルでもロール確認を行う

---

## 5. データフロー・処理フロー

### 5.1 基本データフロー

```text
1. IoT Device collects motion data
2. AI Server analyzes sensor data
3. AI Server sends POST request to Web App API
4. Web App validates payload
5. Web App stores alert/event to DB
6. Dashboard receives latest state via API or real-time mechanism
7. Staff acknowledges or records response
8. Updated history is persisted in DB
```

### 5.2 アラート発生フロー

```text
IoT Device
  → AI Inference Server
  → Fall prediction result
  → HTTP POST to /api/alert or equivalent
  → Web App validates and stores FallLog
  → Dashboard displays alarm banner
  → Nurse acknowledges
  → responseTime and notes are updated
```

### 5.3 ユーザー招待フロー

```text
Admin
  → Invite staff by email
  → Clerk invites user
  → User accepts invitation
  → Clerk webhook triggers
  → Web App updates User record
  → Staff list refreshes automatically
```

---

## 6. 外部システムとの連携

### 6.1 AI推論サーバー
- **連携方式**: HTTP POST (JSON)
- **送信元**: FastAPI / Pythonサーバー
- **送信内容**: `isfall`, `battery_per`, `device_name`, `status`
- **受信先**: Web App API Route (`/api/alert`)

### 6.2 Clerk
- **連携方式**: 認証 / Webhook
- **用途**: メール招待、ユーザー登録同期、ロール/プロフィール同期

### 6.3 PostgreSQL
- **連携方式**: Prisma Client
- **用途**: 永続データ保存、画面表示用データ取得、アラート履歴の保存

---

## 7. データベース設計

### 7.1 設計方針
- 高齢者ごとにデバイス割当を管理できる
- 1つのデバイスを複数人に使い回せる
- 1人の高齢者に対して履歴を継続して残せる
- 介護スタッフの対応履歴を追跡できる
- 退所・死亡などに伴う状態を保持しつつ削除しない

### 7.2 ER図の考え方

```text
User 1 --- n Elder
User 1 --- n FallLog
Elder 1 --- n DeviceAssignment
Elder 1 --- n FallLog
Device 1 --- n DeviceAssignment
Device 1 --- n FallLog
```

### 7.3 テーブル一覧

#### 7.3.1 User
| 項目 | 説明 |
| --- | --- |
| id | 主キー（CUID） |
| clerkId | ClerkのユーザーID |
| firstName | 名 |
| lastName | 姓 |
| email | メールアドレス（ユニーク） |
| role | CAREGIVER / NURSE / ADMIN |
| status | PENDING / ACTIVE |
| createdAt | 作成日時 |
| updatedAt | 更新日時 |

#### 7.3.2 Elder
| 項目 | 説明 |
| --- | --- |
| id | 主キー |
| firstName | 名 |
| lastName | 姓 |
| roomNumber | 部屋番号 |
| status | ACTIVE / INACTIVE |
| createdById | 登録者ID |
| createdAt | 作成日時 |
| updatedAt | 更新日時 |

#### 7.3.3 Device
| 項目 | 説明 |
| --- | --- |
| id | 主キー |
| deviceName | デバイス名 |
| serialCode | シリアル番号 |
| createdAt | 作成日時 |
| updatedAt | 更新日時 |

#### 7.3.4 DeviceAssignment
| 項目 | 説明 |
| --- | --- |
| id | 主キー |
| elderId | 高齢者ID |
| deviceId | デバイスID |
| is_active | 現在割当中かどうか |
| assignedAt | 割当開始日時 |
| removedAt | 割当解除日時 |

#### 7.3.5 FallLog
| 項目 | 説明 |
| --- | --- |
| id | 主キー |
| elderId | 影響を受けた高齢者 |
| deviceId | 送信したデバイス |
| staffId | 対応したスタッフ |
| alarmTime | アラーム発生時刻 |
| responseTime | 認証時刻 |
| isActualFall | 本当に転倒したか |
| notes | 対応メモ |

### 7.4 Prisma定義例

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String     @id @default(cuid())
  clerkId   String?    @unique
  firstName String
  lastName  String
  email     String     @unique
  role      UserRole
  status    UserStatus @default(PENDING)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model Elder {
  id         String      @id @default(cuid())
  firstName  String
  lastName   String
  roomNumber String?
  status     ElderStatus @default(ACTIVE)
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
}

model FallLog {
  id           String    @id @default(cuid())
  elderId      String
  deviceId     String
  staffId      String?
  alarmTime    DateTime  @default(now())
  responseTime DateTime?
  isActualFall Boolean?
  notes        String?
}
```

---

## 8. 主要API設計

### 8.1 代表的なルート

| パス | 内容 |
| --- | --- |
| /api/webhooks/clerk | Clerk webhook 受信 |
| /api/staff | スタッフ一覧取得 |
| /api/staff/invitations | 招待作成・一覧 |
| /api/staff/[id]/role | ロール更新 |
| /api/alert | AIからのアラート受信 |

---

## 9. 非機能要件

- **性能要件**: アラート通知は数秒以内に表示し、ダッシュボード画面を迅速に描画。
- **可用性要件**: DB障害時や認証基盤障害時の安全性を考慮した設計。
- **セキュリティ要件**: 秘密鍵（Clerk Secret Key等）のサーバー管理、APIでの権限確認、`.env`の適切な管理。
- **CI/CD・デプロイ**: Dockerコンテナ化、GitHub Actions、AWS EC2環境での運用対応。

---

## 10. 制約・前提条件

- PostgreSQL が利用可能であること
- Clerk アカウントおよび秘密鍵が発行済みであること
- AI サーバーが HTTP でアラートを送信可能であること
- フロントエンドは Next.js App Router 前提で設計すること
- 対象環境はローカル開発環境および AWS EC2 / Docker 構成とする

---

## 11. 未決事項・備考

- Webhook 検証ロジックの確定
- バックアップおよびリストア方針の策定
