import { assertSameOrg } from "@calcom/lib/teams/assertSameOrg";
import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TGetMembersInputSchema } from "./getMembers.schema";

type GetMembersHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "organizationId">;
  };
  input: TGetMembersInputSchema;
};

export const getMembersHandler = async ({ ctx, input }: GetMembersHandlerOptions) => {
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
    select: {
      accepted: true,
      team: { select: { parentId: true } },
    },
  });
  if (!membership?.accepted) throw new TRPCError({ code: "UNAUTHORIZED" });

  assertSameOrg(membership.team, ctx.user);

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
