import prisma from "@calcom/prisma";
import type { MembershipRole } from "@calcom/prisma/enums";

type CheckPermissionArgs = {
  userId: number;
  teamId: number;
  /** Permission string in "resource.action" format, e.g. "team.update" */
  permission: string;
  /** MembershipRole fallbacks when the membership has no customRole assigned */
  fallbackRoles?: MembershipRole[];
};

export class PermissionCheckService {
  async checkPermission({ userId, teamId, permission, fallbackRoles = [] }: CheckPermissionArgs): Promise<boolean> {
    const [resource, action] = permission.split(".");

    const membership = await prisma.membership.findUnique({
      where: { userId_teamId: { userId, teamId } },
      select: {
        accepted: true,
        role: true,
        customRole: {
          select: {
            permissions: {
              select: { resource: true, action: true },
            },
          },
        },
      },
    });

    if (!membership?.accepted) return false;

    if (membership.customRole) {
      return membership.customRole.permissions.some(
        (p) =>
          (p.resource === "*" || p.resource === resource) &&
          (p.action === "*" || p.action === action)
      );
    }

    // No customRole — fall back to MembershipRole check
    return fallbackRoles.length > 0 && fallbackRoles.includes(membership.role);
  }
}
