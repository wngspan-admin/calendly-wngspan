import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { checkTeamPermission } from "@calcom/lib/teams/checkTeamPermission";

import type { TrpcSessionUser } from "../../../types";
import type { TChangeMemberRoleInputSchema } from "./changeMemberRole.schema";

type ChangeMemberRoleHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TChangeMemberRoleInputSchema;
};

export const changeMemberRoleHandler = async ({ ctx, input }: ChangeMemberRoleHandlerOptions) => {
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.OWNER);

  return prisma.membership.update({
    where: { userId_teamId: { userId: input.memberId, teamId: input.teamId } },
    data: { role: input.role },
  });
};
