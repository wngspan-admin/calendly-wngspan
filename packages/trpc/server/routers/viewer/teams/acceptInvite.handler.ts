import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TAcceptInviteInputSchema } from "./acceptInvite.schema";

type AcceptInviteHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TAcceptInviteInputSchema;
};

export const acceptInviteHandler = async ({ ctx, input }: AcceptInviteHandlerOptions) => {
  return prisma.membership.update({
    where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
    data: { accepted: true },
  });
};
