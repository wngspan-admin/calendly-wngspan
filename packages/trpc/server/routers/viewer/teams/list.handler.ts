import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";

type ListTeamsHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "organizationId">;
  };
};

export const listTeamsHandler = async ({ ctx }: ListTeamsHandlerOptions) => {
  return prisma.team.findMany({
    where: {
      members: { some: { userId: ctx.user.id, accepted: true } },
      isOrganization: false,
      parentId: ctx.user.organizationId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      isPrivate: true,
      parentId: true,
      members: {
        where: { accepted: true },
        select: {
          role: true,
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};
