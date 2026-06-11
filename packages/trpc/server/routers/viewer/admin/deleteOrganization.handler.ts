import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TAdminDeleteOrganizationSchema } from "./deleteOrganization.schema";

type DeleteOptions = {
  input: TAdminDeleteOrganizationSchema;
};

const deleteOrganizationHandler = async ({ input }: DeleteOptions) => {
  const org = await prisma.team.findUnique({
    where: { id: input.organizationId },
    select: { id: true, isOrganization: true, deletedAt: true },
  });

  if (!org || !org.isOrganization) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
  }

  if (org.deletedAt !== null) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is already deleted" });
  }

  await prisma.$transaction(async (tx) => {
    const childTeams = await tx.team.findMany({
      where: { parentId: input.organizationId, deletedAt: null },
      select: { id: true },
    });
    const allTeamIds = [input.organizationId, ...childTeams.map((t) => t.id)];

    // 1. Delete pending invites for the org and all child teams
    await tx.verificationToken.deleteMany({
      where: { teamId: { in: allTeamIds } },
    });

    // 2. Delete all memberships for the org and child teams
    await tx.membership.deleteMany({
      where: { teamId: { in: allTeamIds } },
    });

    // 3. Soft-delete child teams
    await tx.team.updateMany({
      where: { parentId: input.organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    // 4. Soft-delete the org itself
    await tx.team.update({
      where: { id: input.organizationId },
      data: { deletedAt: new Date() },
    });
  });
};

export default deleteOrganizationHandler;
