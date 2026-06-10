import { getOrganizationRepository } from "@calcom/features/organizations/di/PrismaOrganizationRepository.container";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TUpdateOrgInputSchema } from "./update.schema";

type UpdateOrgHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TUpdateOrgInputSchema;
};

export const updateOrganizationHandler = async ({ ctx, input }: UpdateOrgHandlerOptions) => {
  const { organizationId, name, slug, bio, orgAutoAcceptEmail } = input;
  const repo = getOrganizationRepository();

  const membership = await repo.findMembershipByUserAndOrg(ctx.user.id, organizationId);

  if (!membership || !membership.accepted) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not a member of this organization" });
  }

  if (membership.role !== MembershipRole.OWNER && membership.role !== MembershipRole.ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Requires ADMIN or OWNER role" });
  }

  return repo.update(organizationId, { name, slug, bio, orgAutoAcceptEmail });
};
