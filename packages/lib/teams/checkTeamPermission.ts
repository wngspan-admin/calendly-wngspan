import prisma from "@calcom/prisma";
import type { MembershipRole, Membership } from "@calcom/prisma/client";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  MEMBER: 0,
  ADMIN: 1,
  OWNER: 2,
};

export async function checkTeamPermission(
  userId: number,
  teamId: number,
  requiredRole: MembershipRole
): Promise<Membership> {
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });

  if (!membership || !membership.accepted) {
    throw new ErrorWithCode(ErrorCode.Unauthorized, "Not a member of this team");
  }

  if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new ErrorWithCode(
      ErrorCode.Forbidden,
      `Requires ${requiredRole} role, you have ${membership.role}`
    );
  }

  return membership;
}

export async function getUserTeamRole(
  userId: number,
  teamId: number
): Promise<MembershipRole | null> {
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true, accepted: true },
  });
  if (!membership || !membership.accepted) return null;
  return membership.role;
}

export function canPerformAction(
  userRole: MembershipRole | null,
  requiredRole: MembershipRole
): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
