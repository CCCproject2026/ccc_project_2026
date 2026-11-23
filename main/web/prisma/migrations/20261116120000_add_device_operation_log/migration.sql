-- デバイス管理の操作の監査記録を追加する（詳細設計 03 の10章）
-- 既存のテーブル・列は変更しない。追加だけの migration である。

-- CreateEnum
CREATE TYPE "DeviceOperationAction" AS ENUM ('CREATE', 'UPDATE', 'CHANGE_STATUS', 'ASSIGN', 'UNASSIGN', 'TRANSFER', 'REPLACE', 'END_BY_ELDER_EXIT');

-- CreateTable
CREATE TABLE "DeviceOperationLog" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    "action" "DeviceOperationAction" NOT NULL,
    "deviceId" TEXT NOT NULL,
    "newDeviceId" TEXT,
    "elderId" TEXT,
    "previousElderId" TEXT,
    "endedAssignmentId" TEXT,
    "createdAssignmentId" TEXT,
    "before" JSONB,
    "after" JSONB,

    CONSTRAINT "DeviceOperationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceOperationLog_deviceId_occurredAt_idx" ON "DeviceOperationLog"("deviceId", "occurredAt");

-- CreateIndex
CREATE INDEX "DeviceOperationLog_elderId_occurredAt_idx" ON "DeviceOperationLog"("elderId", "occurredAt");

-- CreateIndex
CREATE INDEX "DeviceOperationLog_actorId_occurredAt_idx" ON "DeviceOperationLog"("actorId", "occurredAt");

-- AddForeignKey
ALTER TABLE "DeviceOperationLog" ADD CONSTRAINT "DeviceOperationLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceOperationLog" ADD CONSTRAINT "DeviceOperationLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ここから下は Prisma で表現できないため手で書く（詳細設計 03 の10章「改変防止」）
-- 監査記録は追加だけを許し、UPDATE・DELETE・TRUNCATE をエラーにする。
-- 注意: DB の所有者はトリガーを削除できるため、誤操作を防ぐためのものである。
CREATE FUNCTION device_operation_log_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'DeviceOperationLog is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_operation_log_no_update_delete
  BEFORE UPDATE OR DELETE ON "DeviceOperationLog"
  FOR EACH ROW EXECUTE FUNCTION device_operation_log_append_only();

CREATE TRIGGER device_operation_log_no_truncate
  BEFORE TRUNCATE ON "DeviceOperationLog"
  FOR EACH STATEMENT EXECUTE FUNCTION device_operation_log_append_only();
