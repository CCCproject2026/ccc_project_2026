-- 20261018135334_init の作り直しで抜けた、Prisma で表現できない制約を戻す（詳細設計 §6）

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
