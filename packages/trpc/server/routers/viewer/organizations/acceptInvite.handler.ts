import { createOrUpdateMemberships } from "@calcom/features/auth/signup/utils/createOrUpdateMemberships";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TAcceptOrganizationInviteSchema } from "./acceptInvite.schema";

type AcceptOrganizationInviteOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TAcceptOrganizationInviteSchema;
};

export const acceptOrganizationInviteHandler = async ({ ctx, input }: AcceptOrganizationInviteOptions) => {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_teamId: {
        userId: ctx.user.id,
        teamId: input.organizationId,
      },
    },
    select: {
      accepted: true,
      role: true,
      team: {
        select: {
          id: true,
          parentId: true,
          isOrganization: true,
          organizationSettings: {
            select: { orgAutoAcceptEmail: true },
          },
        },
      },
    },
  });

  if (!membership?.team.isOrganization) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization invitation not found" });
  }
  if (membership.accepted) {
    return { organizationId: input.organizationId, alreadyAccepted: true };
  }

  await createOrUpdateMemberships({
    user: { id: ctx.user.id },
    team: membership.team,
    membershipRole: membership.role,
  });

  return { organizationId: input.organizationId, alreadyAccepted: false };
};
