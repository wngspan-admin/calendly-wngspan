import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import { checkTeamPermission } from "@calcom/lib/teams/checkTeamPermission";

import type { TrpcSessionUser } from "../../../types";
import type { TInviteMemberInputSchema } from "./inviteMember.schema";

type InviteMemberHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "name" | "email">;
  };
  input: TInviteMemberInputSchema;
};

export const inviteMemberHandler = async ({ ctx, input }: InviteMemberHandlerOptions) => {
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.ADMIN);

  const invitee = await prisma.user.findUnique({ where: { email: input.email } });

  if (!invitee) {
    // Full invite-to-create-account flow (token email) is implemented in Phase 7
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found. Invite-by-email flow coming in Phase 7.",
    });
  }

  const existingMembership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: invitee.id, teamId: input.teamId } },
  });
  if (existingMembership) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "User is already a member of this team" });
  }

  return prisma.membership.create({
    data: {
      teamId: input.teamId,
      userId: invitee.id,
      role: input.role as MembershipRole,
      accepted: false,
    },
  });
};
