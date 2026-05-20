import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import { checkTeamPermission } from "@calcom/lib/teams/checkTeamPermission";

import type { TrpcSessionUser } from "../../../types";

type CreateRoleOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id"> };
  input: { teamId: number; name: string; description?: string; color?: string };
};

export const createRoleHandler = async ({ ctx, input }: CreateRoleOptions) => {
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.ADMIN);

  const existing = await prisma.role.findUnique({
    where: { name_teamId: { name: input.name, teamId: input.teamId } },
  });
  if (existing) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A role with this name already exists" });
  }

  return prisma.role.create({
    data: {
      name: input.name,
      description: input.description,
      color: input.color,
      teamId: input.teamId,
      type: "CUSTOM",
    },
    select: {
      id: true,
      name: true,
      color: true,
      description: true,
      type: true,
      teamId: true,
    },
  });
};
