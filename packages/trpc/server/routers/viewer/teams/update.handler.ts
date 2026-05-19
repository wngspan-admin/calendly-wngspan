import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import { checkTeamPermission } from "@calcom/lib/teams/checkTeamPermission";

import type { TrpcSessionUser } from "../../../types";
import type { TUpdateTeamInputSchema } from "./update.schema";

type UpdateTeamHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TUpdateTeamInputSchema;
};

export const updateTeamHandler = async ({ ctx, input }: UpdateTeamHandlerOptions) => {
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.ADMIN);

  const { teamId, ...data } = input;

  if (data.slug) {
    const existing = await prisma.team.findFirst({
      where: { slug: data.slug, parentId: null, NOT: { id: teamId } },
    });
    if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Slug already taken" });
  }

  return prisma.team.update({ where: { id: teamId }, data });
};
