import { buildMemberPath } from "@calcom/lib/publicRoutes";
import { prisma } from "@calcom/prisma";
import { MembershipRole, PublicRouteEntityType } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type {
  TCompleteOrganizationOnboardingSchema,
  TUpdateOrganizationProfileSlugSchema,
} from "./onboarding.schema";

type OnboardingContext = {
  user: Pick<NonNullable<TrpcSessionUser>, "id">;
};

const assertOrganizationAdmin = async (userId: number, organizationId: number) => {
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId: organizationId } },
    select: { accepted: true, role: true },
  });

  if (
    !membership?.accepted ||
    (membership.role !== MembershipRole.OWNER && membership.role !== MembershipRole.ADMIN)
  ) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Requires ADMIN or OWNER role" });
  }
};

export const updateOrganizationProfileSlugHandler = async ({
  ctx,
  input,
}: {
  ctx: OnboardingContext;
  input: TUpdateOrganizationProfileSlugSchema;
}) => {
  await assertOrganizationAdmin(ctx.user.id, input.organizationId);

  return prisma.$transaction(async (tx) => {
    const [organization, profile] = await Promise.all([
      tx.team.findFirst({
        where: { id: input.organizationId, isOrganization: true, deletedAt: null },
        select: { slug: true },
      }),
      tx.profile.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.user.id,
            organizationId: input.organizationId,
          },
        },
        select: { id: true, username: true },
      }),
    ]);

    if (!organization?.slug || !profile) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Organization profile not found" });
    }
    if (profile.username === input.username) return profile;

    const destinationPath = buildMemberPath(organization.slug, input.username);
    const [existingProfile, historicalRoute] = await Promise.all([
      tx.profile.findFirst({
        where: {
          organizationId: input.organizationId,
          username: input.username,
          id: { not: profile.id },
        },
        select: { id: true },
      }),
      tx.publicRouteRedirect.findUnique({
        where: { sourcePath: destinationPath },
        select: { id: true },
      }),
    ]);

    if (existingProfile || historicalRoute) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Member slug is unavailable" });
    }

    await tx.publicRouteRedirect.create({
      data: {
        sourcePath: buildMemberPath(organization.slug, profile.username),
        destinationPath,
        entityType: PublicRouteEntityType.MEMBER,
      },
    });

    return tx.profile.update({
      where: { id: profile.id },
      data: { username: input.username },
      select: { id: true, username: true },
    });
  });
};

export const completeOrganizationOnboardingHandler = async ({
  ctx,
  input,
}: {
  ctx: OnboardingContext;
  input: TCompleteOrganizationOnboardingSchema;
}) => {
  await assertOrganizationAdmin(ctx.user.id, input.organizationId);

  return prisma.organizationSettings.update({
    where: { organizationId: input.organizationId },
    data: { onboardingCompletedAt: new Date() },
    select: { onboardingCompletedAt: true },
  });
};
