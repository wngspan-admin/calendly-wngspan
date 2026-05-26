import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import { checkTeamPermission } from "@calcom/lib/teams/checkTeamPermission";
import { MembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";

type ListRolesOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id"> };
  input: { teamId: number };
};

export const listRolesHandler = async ({ ctx, input }: ListRolesOptions) => {
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.MEMBER);

  return prisma.role.findMany({
    where: { OR: [{ teamId: input.teamId }, { teamId: null }] },
    select: {
      id: true,
      name: true,
      color: true,
      description: true,
      type: true,
      teamId: true,
      permissions: { select: { id: true, resource: true, action: true } },
    },
    orderBy: { name: "asc" },
  });
};
