/*
  Warnings:

  - You are about to drop the column `status` on the `AccountabilityGroup` table. All the data in the column will be lost.
  - Added the required column `creatorId` to the `AccountabilityGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isActive` to the `AccountabilityGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isPublic` to the `AccountabilityGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AccountabilityGroup" DROP COLUMN "status",
ADD COLUMN     "creatorId" INTEGER NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL;
