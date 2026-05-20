import { randomUUID } from "node:crypto";
import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { getTranslation } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { checkTeamPermission } from "@calcom/lib/teams/checkTeamPermission";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
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

  const team = await prisma.team.findUniqueOrThrow({
    where: { id: input.teamId },
    select: { name: true, isOrganization: true, parent: { select: { name: true } } },
  });

  const invitee = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, locale: true },
  });

  const t = await getTranslation(invitee?.locale ?? "en", "common");

  if (!invitee) {
    // User doesn't have an account yet — store a pending token and send signup invite
    const token = randomUUID();
    await prisma.verificationToken.create({
      data: {
        // Encode role in identifier so it can be recovered during signup
        identifier: `team-invite:${input.role}:${input.email}`,
        token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teamId: input.teamId,
      },
    });

    const joinLink = `${WEBAPP_URL}/auth/signup?token=${token}&email=${encodeURIComponent(input.email)}`;

    await sendTeamInviteEmail({
      language: t,
      from: ctx.user.name ?? ctx.user.email,
      to: input.email,
      teamName: team.name,
      joinLink,
      isCalcomMember: false,
      isAutoJoin: false,
      isOrg: team.isOrganization,
      parentTeamName: team.parent?.name ?? undefined,
      isExistingUserMovedToOrg: false,
      prevLink: null,
      newLink: null,
    });

    return { status: "invited", email: input.email };
  }

  const existingMembership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: invitee.id, teamId: input.teamId } },
  });
  if (existingMembership) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "User is already a member of this team" });
  }

  const membership = await prisma.membership.create({
    data: {
      teamId: input.teamId,
      userId: invitee.id,
      role: input.role as MembershipRole,
      accepted: false,
    },
  });

  const joinLink = `${WEBAPP_URL}/settings/teams/${input.teamId}/accept`;

  await sendTeamInviteEmail({
    language: t,
    from: ctx.user.name ?? ctx.user.email,
    to: input.email,
    teamName: team.name,
    joinLink,
    isCalcomMember: true,
    isAutoJoin: false,
    isOrg: team.isOrganization,
    parentTeamName: team.parent?.name ?? undefined,
    isExistingUserMovedToOrg: false,
    prevLink: null,
    newLink: null,
  });

  return membership;
};
