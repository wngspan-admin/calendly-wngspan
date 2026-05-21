import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TGetTeamEventTypesInputSchema } from "./getEventTypes.schema";

type GetTeamEventTypesOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TGetTeamEventTypesInputSchema;
};

export const getTeamEventTypesHandler = async ({ ctx, input }: GetTeamEventTypesOptions) => {
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
    select: { role: true, accepted: true },
  });

  if (!membership || !membership.accepted) {
    throw new Error("Not a member of this team");
  }

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
