-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "isListed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "isListed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
