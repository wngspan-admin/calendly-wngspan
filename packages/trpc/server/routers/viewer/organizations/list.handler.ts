import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

type ListOrganizationsHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
};

export const listOrganizationsHandler = async ({ ctx }: ListOrganizationsHandlerOptions) => {
  return prisma.team.findMany({
    where: {
      isOrganization: true,
      members: { some: { userId: ctx.user.id, accepted: true } },
    },
    include: {
      organizationSettings: true,
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
