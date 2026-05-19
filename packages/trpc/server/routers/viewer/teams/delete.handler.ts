import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { checkTeamPermission } from "@calcom/lib/teams/checkTeamPermission";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteTeamInputSchema } from "./delete.schema";

type DeleteTeamHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TDeleteTeamInputSchema;
};

export const deleteTeamHandler = async ({ ctx, input }: DeleteTeamHandlerOptions) => {
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.OWNER);
  return prisma.team.delete({ where: { id: input.teamId } });
};
