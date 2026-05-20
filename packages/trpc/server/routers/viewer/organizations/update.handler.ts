import prisma from "@calcom/prisma";
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

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: ctx.user.id, teamId: organizationId } },
  });

  if (!membership || !membership.accepted) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not a member of this organization" });
  }

  if (membership.role !== MembershipRole.OWNER && membership.role !== MembershipRole.ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Requires ADMIN or OWNER role" });
  }

  const updated = await prisma.team.update({
    where: { id: organizationId },
    data: {
      name,
      slug,
      bio,
      organizationSettings: {
        update: {
          orgAutoAcceptEmail: orgAutoAcceptEmail ?? null,
        },
      },
    },
    include: { organizationSettings: true },
  });

  return updated;
};
