-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "AccountabilityGroup" (
    "groupId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "invitationCode" TEXT NOT NULL,
    "maxMembers" INTEGER NOT NULL,
    "creationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "AccountabilityGroup_pkey" PRIMARY KEY ("groupId")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "membershipId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "GroupRole" NOT NULL,

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("membershipId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountabilityGroup_invitationCode_key" ON "AccountabilityGroup"("invitationCode");

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AccountabilityGroup"("groupId") ON DELETE RESTRICT ON UPDATE CASCADE;
