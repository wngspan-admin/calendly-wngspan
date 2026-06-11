import { assertSameOrg } from "@calcom/lib/teams/assertSameOrg";
import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TGetTeamEventTypesInputSchema } from "./getEventTypes.schema";

type GetTeamEventTypesOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "organizationId">;
  };
  input: TGetTeamEventTypesInputSchema;
};

export const getTeamEventTypesHandler = async ({ ctx, input }: GetTeamEventTypesOptions) => {
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
    select: {
      role: true,
      accepted: true,
      team: { select: { parentId: true } },
    },
  });

  if (!membership || !membership.accepted) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not a member of this team" });
  }

  assertSameOrg(membership.team, ctx.user);

  return prisma.eventType.findMany({
    where: { teamId: input.teamId },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      schedulingType: true,
      hidden: true,
      hosts: {
        select: {
          isFixed: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { position: "asc" },
  });
};
