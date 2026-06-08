import { sendTeamAcceptedEmail } from "@calcom/emails/organization-email-service";
import { getTranslation } from "@calcom/i18n/server";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";
import type { TAcceptInviteInputSchema } from "./acceptInvite.schema";

type AcceptInviteHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "name" | "email">;
  };
  input: TAcceptInviteInputSchema;
};

export const acceptInviteHandler = async ({ ctx, input }: AcceptInviteHandlerOptions) => {
  const membership = await prisma.membership.update({
    where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
    data: { accepted: true },
    select: { teamId: true },
  });

  const [team, ownerMembership] = await Promise.all([
    prisma.team.findUnique({
      where: { id: membership.teamId },
      select: { name: true },
    }),
    prisma.membership.findFirst({
      where: { teamId: membership.teamId, role: MembershipRole.OWNER, accepted: true },
      select: { user: { select: { email: true, name: true, locale: true } } },
    }),
  ]);

  if (team && ownerMembership?.user) {
    const owner = ownerMembership.user;
    const t = await getTranslation(owner.locale ?? "en", "common");
    await sendTeamAcceptedEmail({
      language: t,
      to: owner.email,
      teamName: team.name,
      memberName: ctx.user.name ?? ctx.user.email,
    });
  }

  return membership;
};
