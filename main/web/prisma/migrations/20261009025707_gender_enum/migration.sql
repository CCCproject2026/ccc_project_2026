-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- 既存データを保持するため、退避カラムへ変換してから型を切り替える
ALTER TABLE "Elder" ADD COLUMN "gender_new" "Gender";

UPDATE "Elder"
SET "gender_new" = CASE
    WHEN UPPER("gender") IN ('MALE', '男性') THEN 'MALE'::"Gender"
    WHEN UPPER("gender") IN ('FEMALE', '女性') THEN 'FEMALE'::"Gender"
    WHEN UPPER("gender") IN ('OTHER', 'その他') THEN 'OTHER'::"Gender"
    WHEN UPPER("gender") IN ('PREFER_NOT_TO_SAY', '回答しない') THEN 'PREFER_NOT_TO_SAY'::"Gender"
    ELSE 'OTHER'::"Gender"
END;

ALTER TABLE "Elder" DROP COLUMN "gender";
ALTER TABLE "Elder" RENAME COLUMN "gender_new" TO "gender";
ALTER TABLE "Elder" ALTER COLUMN "gender" SET NOT NULL;
