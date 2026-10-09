-- CreateEnum（日本語値を保持する新タイプ。旧 Gender は Elder で使用中のため別名で作成する）
CREATE TYPE "Gender_new" AS ENUM ('男性', '女性', 'その他', '回答しない');

-- Elder: 旧 enum -> 新 enum
ALTER TABLE "Elder" ADD COLUMN "gender_new" "Gender_new";

UPDATE "Elder"
SET "gender_new" = CASE
    WHEN UPPER("gender"::text) IN ('MALE', '男性') THEN '男性'::"Gender_new"
    WHEN UPPER("gender"::text) IN ('FEMALE', '女性') THEN '女性'::"Gender_new"
    WHEN UPPER("gender"::text) IN ('OTHER', 'その他') THEN 'その他'::"Gender_new"
    WHEN UPPER("gender"::text) IN ('PREFER_NOT_TO_SAY', '回答しない') THEN '回答しない'::"Gender_new"
    ELSE 'その他'::"Gender_new"
END;

ALTER TABLE "Elder" DROP COLUMN "gender";
ALTER TABLE "Elder" RENAME COLUMN "gender_new" TO "gender";
ALTER TABLE "Elder" ALTER COLUMN "gender" SET NOT NULL;

-- User: String -> 新 enum
ALTER TABLE "User" ADD COLUMN "gender_new" "Gender_new";

UPDATE "User"
SET "gender_new" = CASE
    WHEN UPPER("gender"::text) IN ('MALE', '男性') THEN '男性'::"Gender_new"
    WHEN UPPER("gender"::text) IN ('FEMALE', '女性') THEN '女性'::"Gender_new"
    WHEN UPPER("gender"::text) IN ('OTHER', 'その他') THEN 'その他'::"Gender_new"
    WHEN UPPER("gender"::text) IN ('PREFER_NOT_TO_SAY', '回答しない') THEN '回答しない'::"Gender_new"
    ELSE 'その他'::"Gender_new"
END;

ALTER TABLE "User" DROP COLUMN "gender";
ALTER TABLE "User" RENAME COLUMN "gender_new" TO "gender";
ALTER TABLE "User" ALTER COLUMN "gender" SET NOT NULL;

-- DropEnum（旧タイプ。Elder/User カラムを移行済みのため不要）
DROP TYPE "Gender";

-- RenameEnum
ALTER TYPE "Gender_new" RENAME TO "Gender";
