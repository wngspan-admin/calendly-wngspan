import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import type { Membership, MembershipRole } from "@calcom/prisma/client";

const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  MEMBER: 0,
  ADMIN: 1,
  OWNER: 2,
};

export async function checkTeamPermission(
  userId: number,
  teamId: number,
  requiredRole: MembershipRole,
  organizationId?: number | null
): Promise<Membership> {
  const result = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
    include: {
      team: { select: { parentId: true } },
    },
  });

  if (!result || !result.accepted) {
    throw new ErrorWithCode(ErrorCode.Unauthorized, "Not a member of this team");
  }

  // Org isolation: verify the team belongs to the caller's organization when provided.
  // parentId === organizationId covers:
  //   - org users (organizationId !== null) who must match team.parentId
  //   - standalone users (organizationId === null) who may only access parentId-null teams
  if (organizationId !== undefined && result.team.parentId !== organizationId) {
    throw new ErrorWithCode(ErrorCode.Forbidden, "Team does not belong to your organization");
  }

  if (ROLE_HIERARCHY[result.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new ErrorWithCode(ErrorCode.Forbidden, `Requires ${requiredRole} role, you have ${result.role}`);
  }

  const { team: _team, ...membership } = result;
  return membership as Membership;
}

export async function getUserTeamRole(userId: number, teamId: number): Promise<MembershipRole | null> {
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true, accepted: true },
  });
  if (!membership || !membership.accepted) return null;
  return membership.role;
}

export function canPerformAction(userRole: MembershipRole | null, requiredRole: MembershipRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
