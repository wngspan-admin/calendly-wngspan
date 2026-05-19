import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import { checkTeamPermission } from "@calcom/lib/teams/checkTeamPermission";

import type { TrpcSessionUser } from "../../../types";
import type { TRemoveMemberInputSchema } from "./removeMember.schema";

type RemoveMemberHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TRemoveMemberInputSchema;
};

export const removeMemberHandler = async ({ ctx, input }: RemoveMemberHandlerOptions) => {
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.ADMIN);

  const targetMembership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: input.memberId, teamId: input.teamId } },
  });
  if (!targetMembership) throw new TRPCError({ code: "NOT_FOUND" });

  if (targetMembership.role === MembershipRole.OWNER && ctx.user.id !== input.memberId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove the team owner" });
  }

  return prisma.membership.delete({
    where: { userId_teamId: { userId: input.memberId, teamId: input.teamId } },
  });
};
