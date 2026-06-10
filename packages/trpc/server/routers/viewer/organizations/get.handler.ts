import { getOrganizationRepository } from "@calcom/features/organizations/di/PrismaOrganizationRepository.container";
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
  const repo = getOrganizationRepository();

  const org = await repo.findByIdIncludeMembersAndSettings(input.organizationId);

  if (!org) throw new TRPCError({ code: "NOT_FOUND" });

  const isMember = org.members.some((m) => m.user.id === ctx.user.id);
  if (!isMember) throw new TRPCError({ code: "UNAUTHORIZED" });

  return org;
};
