-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- Elder.gender: TEXT -> Gender enum
ALTER TABLE "Elder"
    ALTER COLUMN "gender" TYPE "Gender"
    USING (UPPER("gender")::"Gender");

-- User.gender: TEXT -> Gender enum
ALTER TABLE "User"
    ALTER COLUMN "gender" TYPE "Gender"
    USING (UPPER("gender")::"Gender");
