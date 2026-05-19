import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetTeamInputSchema } from "./get.schema";

type GetTeamHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TGetTeamInputSchema;
};

export const getTeamHandler = async ({ ctx, input }: GetTeamHandlerOptions) => {
  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    include: {
      members: {
        where: { accepted: true },
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!team) throw new TRPCError({ code: "NOT_FOUND" });

  const isMember = team.members.some((m) => m.user.id === ctx.user.id);
  if (!isMember) throw new TRPCError({ code: "UNAUTHORIZED" });

  return team;
};
