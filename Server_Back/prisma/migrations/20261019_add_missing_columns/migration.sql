-- AlterTable
ALTER TABLE "accountability_groups" ADD COLUMN     "flagReason" TEXT,
ADD COLUMN     "reviewed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "habits" ADD COLUMN     "sharedGroupIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "sharingMode" TEXT NOT NULL DEFAULT 'PRIVATE';

