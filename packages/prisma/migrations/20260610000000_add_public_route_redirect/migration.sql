-- CreateEnum
CREATE TYPE "PublicRouteEntityType" AS ENUM ('ORGANIZATION', 'MEMBER', 'TEAM', 'EVENT');

-- CreateTable
CREATE TABLE "PublicRouteRedirect" (
    "id" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "destinationPath" TEXT NOT NULL,
    "entityType" "PublicRouteEntityType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicRouteRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicRouteRedirect_sourcePath_key" ON "PublicRouteRedirect"("sourcePath");

-- CreateIndex
CREATE INDEX "PublicRouteRedirect_enabled_sourcePath_idx" ON "PublicRouteRedirect"("enabled", "sourcePath");
