import { randomUUID } from "node:crypto";
import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { getTranslation } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { buildOrganizationPath } from "@calcom/lib/publicRoutes";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TAdminProvisionOrganizationSchema } from "./provisionOrganization.schema";

type ProvisionOrganizationOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "name" | "email">;
  };
  input: TAdminProvisionOrganizationSchema;
};

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const provisionOrganizationHandler = async ({ ctx, input }: ProvisionOrganizationOptions) => {
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const token = randomUUID();

  const result = await prisma.$transaction(async (tx) => {
    const [existingOrganization, historicalRoute, owner] = await Promise.all([
      tx.team.findFirst({
        where: { slug: input.slug, parentId: null, deletedAt: null },
        select: { id: true },
      }),
      tx.publicRouteRedirect.findUnique({
        where: { sourcePath: buildOrganizationPath(input.slug) },
        select: { id: true },
      }),
      tx.user.findUnique({
        where: { email: ownerEmail },
        select: { id: true, username: true, locale: true },
      }),
    ]);

    if (existingOrganization || historicalRoute) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Organization slug is unavailable" });
    }

    const organization = await tx.team.create({
      data: {
        name: input.name,
        slug: input.slug,
        bio: input.bio,
        logoUrl: input.logoUrl,
        bannerUrl: input.bannerUrl,
        brandColor: input.brandColor,
        darkBrandColor: input.darkBrandColor,
        isOrganization: true,
        organizationSettings: {
          create: {
            orgAutoAcceptEmail: "",
            isOrganizationConfigured: true,
          },
        },
      },
      select: { id: true, name: true, slug: true },
    });

    await tx.membership.create({
      data: {
        teamId: organization.id,
        userId: ctx.user.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    if (owner) {
      if (owner.id !== ctx.user.id) {
        await tx.membership.create({
          data: {
            teamId: organization.id,
            userId: owner.id,
            role: MembershipRole.OWNER,
            accepted: false,
          },
        });
      }

      await tx.profile.upsert({
        where: {
          userId_organizationId: {
            userId: owner.id,
            organizationId: organization.id,
          },
        },
        create: {
          uid: ProfileRepository.generateProfileUid(),
          userId: owner.id,
          organizationId: organization.id,
          username: owner.username ?? getOrgUsernameFromEmail(ownerEmail, null),
        },
        update: {},
      });
    } else {
      await tx.verificationToken.create({
        data: {
          identifier: ownerEmail,
          token,
          expires: new Date(Date.now() + INVITATION_TTL_MS),
          teamId: organization.id,
          membershipRole: MembershipRole.OWNER,
        },
      });
    }

    return { organization, owner, token };
  });

  if (result.owner?.id !== ctx.user.id) {
    const t = await getTranslation(result.owner?.locale ?? "en", "common");
    const joinLink = result.owner
      ? `${WEBAPP_URL}/settings/organizations/${result.organization.id}/accept`
      : `${WEBAPP_URL}/auth/signup?token=${result.token}&email=${encodeURIComponent(ownerEmail)}`;

    await sendTeamInviteEmail({
      language: t,
      from: ctx.user.name ?? ctx.user.email,
      to: ownerEmail,
      teamName: result.organization.name,
      joinLink,
      isCalcomMember: !!result.owner,
      isAutoJoin: false,
      isOrg: true,
      parentTeamName: undefined,
      isExistingUserMovedToOrg: false,
      prevLink: null,
      newLink: null,
    });
  }

  return result.organization;
};

export default provisionOrganizationHandler;
