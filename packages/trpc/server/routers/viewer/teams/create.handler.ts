import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TCreateTeamInputSchema } from "./create.schema";

type CreateTeamHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "organizationId">;
  };
  input: TCreateTeamInputSchema;
};

export const createTeamHandler = async ({ ctx, input }: CreateTeamHandlerOptions) => {
  // Slug uniqueness is scoped to the same org (parentId), not globally.
  const existing = await prisma.team.findFirst({
    where: { slug: input.slug, parentId: ctx.user.organizationId },
  });
  if (existing) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Slug already taken" });
  }

  return prisma.team.create({
    data: {
      ...input,
      parentId: ctx.user.organizationId,
      members: {
        create: {
          userId: ctx.user.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      members: { select: { role: true, userId: true, accepted: true } },
    },
  });
};
