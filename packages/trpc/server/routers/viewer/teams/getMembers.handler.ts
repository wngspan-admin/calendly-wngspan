import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetMembersInputSchema } from "./getMembers.schema";

type GetMembersHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TGetMembersInputSchema;
};

export const getMembersHandler = async ({ ctx, input }: GetMembersHandlerOptions) => {
  const isMember = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
    select: { accepted: true },
  });
  if (!isMember?.accepted) throw new TRPCError({ code: "UNAUTHORIZED" });

  return prisma.membership.findMany({
    where: { teamId: input.teamId },
    select: {
      role: true,
      accepted: true,
      user: { select: { id: true, name: true, email: true, avatarUrl: true, username: true } },
    },
    orderBy: { createdAt: "asc" },
  });
};
