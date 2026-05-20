import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateOrgInputSchema } from "./create.schema";

type CreateOrganizationHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TCreateOrgInputSchema;
};

export const createOrganizationHandler = async ({ ctx, input }: CreateOrganizationHandlerOptions) => {
  const existing = await prisma.team.findFirst({
    where: { slug: input.slug, parentId: null },
  });
  if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Slug already taken" });

  return prisma.team.create({
    data: {
      name: input.name,
      slug: input.slug,
      bio: input.bio,
      isOrganization: true,
      members: {
        create: {
          userId: ctx.user.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
      organizationSettings: {
        create: {
          orgAutoAcceptEmail: input.orgAutoAcceptEmail ?? "",
          isOrganizationConfigured: true,
        },
      },
    },
    include: { organizationSettings: true },
  });
};
