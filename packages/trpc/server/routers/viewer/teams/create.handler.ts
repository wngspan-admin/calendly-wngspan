import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateTeamInputSchema } from "./create.schema";

type CreateTeamHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TCreateTeamInputSchema;
};

export const createTeamHandler = async ({ ctx, input }: CreateTeamHandlerOptions) => {
  const existing = await prisma.team.findFirst({
    where: { slug: input.slug, parentId: null },
  });
  if (existing) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Slug already taken" });
  }

  return prisma.team.create({
    data: {
      ...input,
      members: {
        create: {
          userId: ctx.user.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
    },
    include: { members: true },
  });
};
