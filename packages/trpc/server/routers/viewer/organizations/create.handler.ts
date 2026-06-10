import { getOrganizationRepository } from "@calcom/features/organizations/di/PrismaOrganizationRepository.container";
import { buildOrganizationPath } from "@calcom/lib/publicRoutes";
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
  const repo = getOrganizationRepository();

  const existing = await repo.findBySlug(input.slug);
  if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Slug already taken" });

  const historicalPath = await repo.findRedirectBySourcePath(buildOrganizationPath(input.slug));
  if (historicalPath) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Slug is reserved by a historical public route" });
  }

  return repo.create({
    name: input.name,
    slug: input.slug,
    bio: input.bio,
    userId: ctx.user.id,
    role: MembershipRole.OWNER,
    orgAutoAcceptEmail: input.orgAutoAcceptEmail ?? "",
  });
};
