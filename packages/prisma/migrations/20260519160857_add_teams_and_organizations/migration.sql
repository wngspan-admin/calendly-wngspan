-- AlterTable
ALTER TABLE "public"."EventType" ADD COLUMN     "schedulingTypeData" JSONB;

-- AlterTable
ALTER TABLE "public"."Membership" ADD COLUMN     "disableImpersonation" BOOLEAN NOT NULL DEFAULT false;
