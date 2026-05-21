import prisma from "@calcom/prisma";
import { MembershipRole, RoleType } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import { checkTeamPermission } from "@calcom/lib/teams/checkTeamPermission";

import type { TrpcSessionUser } from "../../../types";

type DeleteRoleOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id"> };
  input: { roleId: string; teamId: number };
};

export const deleteRoleHandler = async ({ ctx, input }: DeleteRoleOptions) => {
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.ADMIN);

  const role = await prisma.role.findUnique({
    where: { id: input.roleId },
    select: { id: true, type: true, teamId: true, _count: { select: { memberships: true } } },
  });

  if (!role || role.teamId !== input.teamId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
  }

  if (role.type === RoleType.SYSTEM) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "System roles cannot be deleted" });
  }

  if (role._count.memberships > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot delete a role that is assigned to team members",
    });
  }

  await prisma.role.delete({ where: { id: input.roleId } });
};
