import { randomUUID } from "node:crypto";
import { getOrganizationRepository } from "@calcom/features/organizations/di/PrismaOrganizationRepository.container";
import type { PrismaOrganizationRepository } from "@calcom/features/organizations/di/PrismaOrganizationRepository.module";
import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { getTranslation } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
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

const ROLE_ORDER: MembershipRole[] = [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER];

async function assertOrgMembership(
  repo: PrismaOrganizationRepository,
  userId: number,
  organizationId: number,
  minRole: MembershipRole
) {
  const membership = await repo.findMembershipByUserAndOrg(userId, organizationId);
  if (!membership || !membership.accepted) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });
  }
  if (ROLE_ORDER.indexOf(membership.role) < ROLE_ORDER.indexOf(minRole)) {
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
  const repo = getOrganizationRepository();

  await assertOrgMembership(repo, ctx.user.id, input.organizationId, MembershipRole.ADMIN);

  const org = await repo.findById(input.organizationId);

  const invitee = await repo.findUserByEmail(input.email);

  const t = await getTranslation(invitee?.locale ?? "en", "common");
  const joinLink = `${WEBAPP_URL}/settings/teams/${input.organizationId}/accept`;

  if (!invitee) {
    const token = randomUUID();
    await repo.createInviteToken({
      identifier: input.email,
      token,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      teamId: input.organizationId,
      membershipRole: input.role,
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

  const existing = await repo.findMembershipByUserAndOrg(invitee.id, input.organizationId);
  if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "User is already a member" });

  await repo.createMembership({
    teamId: input.organizationId,
    userId: invitee.id,
    role: input.role,
    accepted: false,
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
  const repo = getOrganizationRepository();
  await assertOrgMembership(repo, ctx.user.id, input.organizationId, MembershipRole.MEMBER);
  return repo.findMembersByOrg(input.organizationId);
};

export const removeOrganizationMemberHandler = async ({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: TRemoveOrgMemberInputSchema;
}) => {
  const repo = getOrganizationRepository();
  const actorRole = await assertOrgMembership(repo, ctx.user.id, input.organizationId, MembershipRole.ADMIN);

  const target = await repo.findMembershipByUserAndOrg(input.memberId, input.organizationId);
  if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Membership not found" });

  if (ROLE_ORDER.indexOf(actorRole) <= ROLE_ORDER.indexOf(target.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove a member with equal or higher role" });
  }

  await repo.deleteMembership(input.memberId, input.organizationId);
  return { success: true };
};

export const changeOrganizationMemberRoleHandler = async ({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: TChangeOrgMemberRoleInputSchema;
}) => {
  const repo = getOrganizationRepository();
  await assertOrgMembership(repo, ctx.user.id, input.organizationId, MembershipRole.OWNER);

  const target = await repo.findMembershipByUserAndOrg(input.memberId, input.organizationId);
  if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Membership not found" });

  return repo.updateMembershipRole(input.memberId, input.organizationId, input.role);
};

export const bulkRemoveOrganizationMembersHandler = async ({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: TBulkRemoveOrgMembersInputSchema;
}) => {
  const repo = getOrganizationRepository();
  const actorRole = await assertOrgMembership(repo, ctx.user.id, input.organizationId, MembershipRole.ADMIN);

  const targets = await repo.findMembershipsByOrgAndUserIds(input.organizationId, input.memberIds);

  for (const target of targets) {
    if (ROLE_ORDER.indexOf(actorRole) <= ROLE_ORDER.indexOf(target.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Cannot remove member with id ${target.userId}: insufficient permissions`,
      });
    }
  }

  await repo.deleteMemberships(input.organizationId, input.memberIds);
  return { success: true, removedCount: targets.length };
};

export const bulkChangeOrganizationMemberRoleHandler = async ({
  ctx,
  input,
}: {
  ctx: Ctx;
  input: TBulkChangeOrgMemberRoleInputSchema;
}) => {
  const repo = getOrganizationRepository();
  await assertOrgMembership(repo, ctx.user.id, input.organizationId, MembershipRole.OWNER);

  const targets = await repo.findMembershipsByOrgAndUserIds(input.organizationId, input.memberIds);
  if (targets.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "No matching members found" });

  await repo.updateMembershipsRole(input.organizationId, input.memberIds, input.role);
  return { success: true, updatedCount: targets.length };
};
