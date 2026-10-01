-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CAREGIVER', 'NURSE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ElderStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ServerLogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "dateOfBirth" DATE NOT NULL,
    "nationality" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Elder" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "status" "ElderStatus" NOT NULL DEFAULT 'ACTIVE',
    "dateOfBirth" DATE NOT NULL,
    "gender" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Elder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "deviceCode" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceAssignment" (
    "id" TEXT NOT NULL,
    "elderId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL,
    "unassignedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DeviceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseRecord" (
    "id" TEXT NOT NULL,
    "elderId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActualFall" BOOLEAN NOT NULL,
    "responseStartedAt" TIMESTAMPTZ(3) NOT NULL,
    "completedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ResponseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerLog" (
    "id" TEXT NOT NULL,
    "level" "ServerLogLevel" NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "Elder_status_idx" ON "Elder"("status");

-- CreateIndex
CREATE INDEX "Elder_lastName_firstName_idx" ON "Elder"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceCode_key" ON "Device"("deviceCode");

-- CreateIndex
CREATE INDEX "Device_status_idx" ON "Device"("status");

-- CreateIndex
CREATE INDEX "DeviceAssignment_elderId_assignedAt_idx" ON "DeviceAssignment"("elderId", "assignedAt");

-- CreateIndex
CREATE INDEX "DeviceAssignment_deviceId_assignedAt_idx" ON "DeviceAssignment"("deviceId", "assignedAt");

-- CreateIndex
CREATE INDEX "DeviceAssignment_unassignedAt_idx" ON "DeviceAssignment"("unassignedAt");

-- CreateIndex
CREATE INDEX "ResponseRecord_elderId_createdAt_idx" ON "ResponseRecord"("elderId", "createdAt");

-- CreateIndex
CREATE INDEX "ResponseRecord_staffId_createdAt_idx" ON "ResponseRecord"("staffId", "createdAt");

-- CreateIndex
CREATE INDEX "ResponseRecord_createdAt_idx" ON "ResponseRecord"("createdAt");

-- CreateIndex
CREATE INDEX "ServerLog_source_occurredAt_idx" ON "ServerLog"("source", "occurredAt");

-- CreateIndex
CREATE INDEX "ServerLog_level_occurredAt_idx" ON "ServerLog"("level", "occurredAt");

-- CreateIndex
CREATE INDEX "ServerLog_createdAt_idx" ON "ServerLog"("createdAt");

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "Elder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseRecord" ADD CONSTRAINT "ResponseRecord_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "Elder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseRecord" ADD CONSTRAINT "ResponseRecord_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma のスキーマ文法で表現できない制約（詳細設計 §6）
-- @@unique に部分条件を書けないため、有効な割当の重複は migration で管理する

-- 有効な割当の重複防止（詳細設計 §6.1）
CREATE UNIQUE INDEX "device_assignment_active_elder_idx"
ON "DeviceAssignment" ("elderId")
WHERE "unassignedAt" IS NULL;

CREATE UNIQUE INDEX "device_assignment_active_device_idx"
ON "DeviceAssignment" ("deviceId")
WHERE "unassignedAt" IS NULL;

-- 割当期間の整合性（詳細設計 §6.2）
ALTER TABLE "DeviceAssignment"
ADD CONSTRAINT "device_assignment_period_check"
CHECK ("unassignedAt" IS NULL OR "assignedAt" < "unassignedAt");

-- 対応記録の日時整合性（詳細設計 §6.3）
ALTER TABLE "ResponseRecord"
ADD CONSTRAINT "response_record_time_check"
CHECK ("responseStartedAt" <= "completedAt");

-- 対応記録の入力制約（詳細設計 §4.5）content は空文字・空白のみを許可しない
ALTER TABLE "ResponseRecord"
ADD CONSTRAINT "response_record_content_check"
CHECK (length(btrim("content")) > 0);
