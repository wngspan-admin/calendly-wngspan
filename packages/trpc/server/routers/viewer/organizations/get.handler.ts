import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetOrgInputSchema } from "./get.schema";

type GetOrgHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TGetOrgInputSchema;
};

export const getOrganizationHandler = async ({ ctx, input }: GetOrgHandlerOptions) => {
  const org = await prisma.team.findUnique({
    where: { id: input.organizationId, isOrganization: true },
    include: {
      organizationSettings: true,
      members: {
        where: { accepted: true },
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!org) throw new TRPCError({ code: "NOT_FOUND" });

  const isMember = org.members.some((m) => m.user.id === ctx.user.id);
  if (!isMember) throw new TRPCError({ code: "UNAUTHORIZED" });

  return org;
};
