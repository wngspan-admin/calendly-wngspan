import { randomUUID } from "node:crypto";
import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { getTranslation } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type {
  TBulkChangeOrgMemberRoleInputSchema,
  TBulkRemoveOrgMembersInputSchema,
  TChangeOrgMemberRoleInputSchema,
  TGetOrgMembersInputSchema,
  TInviteOrgMemberInputSchema,
  TRemoveOrgMemberInputSchema,
} from "./members.schema";

type Ctx = {
  user: Pick<NonNullable<TrpcSessionUser>, "id">;
};

async function assertOrgMembership(userId: number, organizationId: number, minRole: MembershipRole) {
  const roleOrder: MembershipRole[] = [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER];
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId: organizationId } },
    select: { role: true, accepted: true },
  });
  if (!membership || !membership.accepted) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });
  }
  if (roleOrder.indexOf(membership.role) < roleOrder.indexOf(minRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: `Requires ${minRole} role` });
  }
  return membership.role;
}

export const inviteOrganizationMemberHandler = async ({
  ctx,
  input,
}: {
  ctx: Ctx & { user: Pick<NonNullable<TrpcSessionUser>, "id" | "name" | "email"> };
  input: TInviteOrgMemberInputSchema;
}) => {
  await assertOrgMembership(ctx.user.id, input.organizationId, MembershipRole.ADMIN);

  const org = await prisma.team.findUniqueOrThrow({
    where: { id: input.organizationId },
    select: { name: true, isOrganization: true },
  });

  const invitee = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, locale: true },
  });

  const t = await getTranslation(invitee?.locale ?? "en", "common");
  const joinLink = `${WEBAPP_URL}/settings/teams/${input.organizationId}/accept`;

  if (!invitee) {
    const token = randomUUID();
    await prisma.verificationToken.create({
      data: {
        identifier: input.email,
        token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teamId: input.organizationId,
        membershipRole: input.role,
      },
    });

    await sendTeamInviteEmail({
      language: t,
      from: ctx.user.name ?? ctx.user.email,
      to: input.email,
      teamName: org.name,
      joinLink: `${WEBAPP_URL}/auth/signup?token=${token}&email=${encodeURIComponent(input.email)}`,
      isCalcomMember: false,
      isAutoJoin: false,
      isOrg: true,
      parentTeamName: undefined,
      isExistingUserMovedToOrg: false,
      prevLink: null,
      newLink: null,
    });

    return { status: "invited", email: input.email };
  }

  const existing = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: invitee.id, teamId: input.organizationId } },
  });
  if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "User is already a member" });

  await prisma.membership.create({
    data: { teamId: input.organizationId, userId: invitee.id, role: input.role, accepted: false },
  });

  await sendTeamInviteEmail({
    language: t,
    from: ctx.user.name ?? ctx.user.email,
    to: input.email,
    teamName: org.name,
    joinLink,
    isCalcomMember: true,
    isAutoJoin: false,
    isOrg: true,
    parentTeamName: undefined,
    isExistingUserMovedToOrg: false,
    prevLink: null,
    newLink: null,
  });

  return { status: "invited", email: input.email };
};

export const getOrganizationMembersHandler = async ({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: TGetOrgMembersInputSchema;
}) => {
  await assertOrgMembership(ctx.user.id, input.organizationId, MembershipRole.MEMBER);

  return prisma.membership.findMany({
    where: { teamId: input.organizationId },
    orderBy: [{ accepted: "desc" }, { user: { email: "asc" } }],
    select: {
      role: true,
      accepted: true,
      user: {
        select: { id: true, email: true, name: true, username: true, avatarUrl: true },
      },
    },
  });
};

export const removeOrganizationMemberHandler = async ({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: TRemoveOrgMemberInputSchema;
}) => {
  const actorRole = await assertOrgMembership(ctx.user.id, input.organizationId, MembershipRole.ADMIN);

  const target = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: input.memberId, teamId: input.organizationId } },
    select: { role: true },
  });
  if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Membership not found" });

  const roleOrder: MembershipRole[] = [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER];
  if (roleOrder.indexOf(actorRole) <= roleOrder.indexOf(target.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove a member with equal or higher role" });
  }

  await prisma.membership.delete({
    where: { userId_teamId: { userId: input.memberId, teamId: input.organizationId } },
  });

  return { success: true };
};

export const changeOrganizationMemberRoleHandler = async ({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: TChangeOrgMemberRoleInputSchema;
}) => {
  await assertOrgMembership(ctx.user.id, input.organizationId, MembershipRole.OWNER);

  const target = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: input.memberId, teamId: input.organizationId } },
    select: { role: true },
  });
  if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Membership not found" });

  return prisma.membership.update({
    where: { userId_teamId: { userId: input.memberId, teamId: input.organizationId } },
    data: { role: input.role },
    select: { teamId: true, userId: true, role: true, accepted: true },
  });
};

export const bulkRemoveOrganizationMembersHandler = async ({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: TBulkRemoveOrgMembersInputSchema;
}) => {
  const actorRole = await assertOrgMembership(ctx.user.id, input.organizationId, MembershipRole.ADMIN);

  const roleOrder: MembershipRole[] = [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER];

  const targets = await prisma.membership.findMany({
    where: { teamId: input.organizationId, userId: { in: input.memberIds } },
    select: { userId: true, role: true },
  });

  for (const target of targets) {
    if (roleOrder.indexOf(actorRole) <= roleOrder.indexOf(target.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Cannot remove member with id ${target.userId}: insufficient permissions`,
      });
    }
  }

  await prisma.membership.deleteMany({
    where: { teamId: input.organizationId, userId: { in: input.memberIds } },
  });

  return { success: true, removedCount: targets.length };
};

export const bulkChangeOrganizationMemberRoleHandler = async ({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: TBulkChangeOrgMemberRoleInputSchema;
}) => {
  await assertOrgMembership(ctx.user.id, input.organizationId, MembershipRole.OWNER);

  const targets = await prisma.membership.findMany({
    where: { teamId: input.organizationId, userId: { in: input.memberIds } },
    select: { userId: true },
  });
  if (targets.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "No matching members found" });

  await prisma.membership.updateMany({
    where: { teamId: input.organizationId, userId: { in: input.memberIds } },
    data: { role: input.role },
  });

  return { success: true, updatedCount: targets.length };
};
