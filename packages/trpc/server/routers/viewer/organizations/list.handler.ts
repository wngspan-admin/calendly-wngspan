import { getOrganizationRepository } from "@calcom/features/organizations/di/PrismaOrganizationRepository.container";

import type { TrpcSessionUser } from "../../../types";

type ListOrganizationsHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
};

export const listOrganizationsHandler = async ({ ctx }: ListOrganizationsHandlerOptions) => {
  const repo = getOrganizationRepository();
  return repo.findManyByUserIdIncludeMembersAndSettings(ctx.user.id);
};
