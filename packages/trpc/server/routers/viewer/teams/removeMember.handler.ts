import { sendTeamRemovedEmail } from "@calcom/emails/organization-email-service";
import { getTranslation } from "@calcom/i18n/server";
import { checkTeamPermission } from "@calcom/lib/teams/checkTeamPermission";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TRemoveMemberInputSchema } from "./removeMember.schema";

type RemoveMemberHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "organizationId">;
  };
  input: TRemoveMemberInputSchema;
};

export const removeMemberHandler = async ({ ctx, input }: RemoveMemberHandlerOptions) => {
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.ADMIN, ctx.user.organizationId);

  const targetMembership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: input.memberId, teamId: input.teamId } },
    select: { role: true, user: { select: { email: true, locale: true } } },
  });
  if (!targetMembership) throw new TRPCError({ code: "NOT_FOUND" });

  if (targetMembership.role === MembershipRole.OWNER && ctx.user.id !== input.memberId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove the team owner" });
  }

  const [deleted, team] = await Promise.all([
    prisma.membership.delete({
      where: { userId_teamId: { userId: input.memberId, teamId: input.teamId } },
    }),
    prisma.team.findUnique({
      where: { id: input.teamId },
      select: { name: true },
    }),
  ]);

  if (team) {
    const t = await getTranslation(targetMembership.user.locale ?? "en", "common");
    await sendTeamRemovedEmail({
      language: t,
      to: targetMembership.user.email,
      teamName: team.name,
    });
  }

  return deleted;
};
