import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { buildOrganizationPath } from "@calcom/lib/publicRoutes";
import type { PrismaClient } from "@calcom/prisma";
import type { MembershipRole } from "@calcom/prisma/enums";
import { PublicRouteEntityType } from "@calcom/prisma/enums";

type CreateOrgData = {
  name: string;
  slug: string;
  bio?: string | null;
  userId: number;
  role: MembershipRole;
  orgAutoAcceptEmail: string;
};

type UpdateOrgData = {
  name?: string;
  slug?: string;
  bio?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  brandColor?: string | null;
  darkBrandColor?: string | null;
  orgAutoAcceptEmail?: string | null;
};

type CreateMembershipData = {
  teamId: number;
  userId: number;
  role: MembershipRole;
  accepted: boolean;
};

type CreateInviteTokenData = {
  identifier: string;
  token: string;
  expires: Date;
  teamId: number;
  membershipRole: MembershipRole;
};

const orgWithSettingsSelect = {
  id: true,
  name: true,
  slug: true,
  bio: true,
  logoUrl: true,
  bannerUrl: true,
  brandColor: true,
  darkBrandColor: true,
  isOrganization: true,
  organizationSettings: {
    select: {
      orgAutoAcceptEmail: true,
      isOrganizationVerified: true,
      isOrganizationConfigured: true,
    },
  },
} as const;

const memberSelect = {
  role: true,
  accepted: true,
  user: {
    select: { id: true, name: true, email: true, avatarUrl: true },
  },
} as const;

export class PrismaOrganizationRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  // ── Team / Org ──────────────────────────────────────────────────────────────

  findBySlug(slug: string) {
    return this.prismaClient.team.findFirst({
      where: { slug, parentId: null },
      select: { id: true },
    });
  }

  findRedirectBySourcePath(sourcePath: string) {
    return this.prismaClient.publicRouteRedirect.findUnique({
      where: { sourcePath },
      select: { id: true },
    });
  }

  /** Throws a Prisma NotFoundError when the org does not exist. */
  findById(id: number) {
    return this.prismaClient.team.findUniqueOrThrow({
      where: { id },
      select: { id: true, name: true, isOrganization: true },
    });
  }

  findByIdIncludeMembersAndSettings(id: number) {
    return this.prismaClient.team.findUnique({
      where: { id, isOrganization: true },
      select: {
        ...orgWithSettingsSelect,
        members: {
          where: { accepted: true },
          select: memberSelect,
        },
      },
    });
  }

  findManyByUserIdIncludeMembersAndSettings(userId: number) {
    return this.prismaClient.team.findMany({
      where: {
        isOrganization: true,
        parentId: null,
        deletedAt: null,
        members: { some: { userId, accepted: true } },
      },
      select: {
        ...orgWithSettingsSelect,
        members: {
          where: { accepted: true },
          select: {
            role: true,
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  create(data: CreateOrgData) {
    return this.prismaClient.team.create({
      data: {
        name: data.name,
        slug: data.slug,
        bio: data.bio,
        isOrganization: true,
        members: {
          create: {
            userId: data.userId,
            role: data.role,
            accepted: true,
          },
        },
        organizationSettings: {
          create: {
            orgAutoAcceptEmail: data.orgAutoAcceptEmail,
            isOrganizationConfigured: true,
          },
        },
      },
      select: orgWithSettingsSelect,
    });
  }

  update(id: number, data: UpdateOrgData) {
    if (data.slug === undefined) {
      return this.prismaClient.team.update({
        where: { id },
        data: {
          name: data.name,
          bio: data.bio,
          logoUrl: data.logoUrl,
          bannerUrl: data.bannerUrl,
          brandColor: data.brandColor,
          darkBrandColor: data.darkBrandColor,
          ...(data.orgAutoAcceptEmail !== undefined && {
            organizationSettings: {
              update: { orgAutoAcceptEmail: data.orgAutoAcceptEmail ?? "" },
            },
          }),
        },
        select: orgWithSettingsSelect,
      });
    }

    const nextSlug = data.slug;
    return this.prismaClient.$transaction(async (tx) => {
      const organization = await tx.team.findUniqueOrThrow({
        where: { id, isOrganization: true },
        select: { slug: true },
      });
      const destinationPath = buildOrganizationPath(nextSlug);
      const historicalPath = await tx.publicRouteRedirect.findUnique({
        where: { sourcePath: destinationPath },
        select: { id: true },
      });

      if (historicalPath && organization.slug !== nextSlug) {
        throw new ErrorWithCode(
          ErrorCode.BadRequest,
          "Organization slug is reserved by a historical public route"
        );
      }

      if (organization.slug && organization.slug !== nextSlug) {
        await tx.publicRouteRedirect.create({
          data: {
            sourcePath: buildOrganizationPath(organization.slug),
            destinationPath,
            entityType: PublicRouteEntityType.ORGANIZATION,
          },
        });
      }

      return tx.team.update({
        where: { id },
        data: {
          name: data.name,
          slug: nextSlug,
          bio: data.bio,
          logoUrl: data.logoUrl,
          bannerUrl: data.bannerUrl,
          brandColor: data.brandColor,
          darkBrandColor: data.darkBrandColor,
          ...(data.orgAutoAcceptEmail !== undefined && {
            organizationSettings: {
              update: { orgAutoAcceptEmail: data.orgAutoAcceptEmail ?? "" },
            },
          }),
        },
        select: orgWithSettingsSelect,
      });
    });
  }

  // ── Membership ───────────────────────────────────────────────────────────────

  findMembershipByUserAndOrg(userId: number, orgId: number) {
    return this.prismaClient.membership.findUnique({
      where: { userId_teamId: { userId, teamId: orgId } },
      select: { role: true, accepted: true },
    });
  }

  findMembersByOrg(orgId: number) {
    return this.prismaClient.membership.findMany({
      where: { teamId: orgId },
      orderBy: [{ accepted: "desc" }, { user: { email: "asc" } }],
      select: {
        role: true,
        accepted: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            avatarUrl: true,
            profiles: {
              where: { organizationId: orgId },
              select: { isListed: true },
              take: 1,
            },
          },
        },
      },
    });
  }

  findMembershipsByOrgAndUserIds(orgId: number, userIds: number[]) {
    return this.prismaClient.membership.findMany({
      where: { teamId: orgId, userId: { in: userIds } },
      select: { userId: true, role: true },
    });
  }

  async createMembership(data: CreateMembershipData) {
    await this.prismaClient.membership.create({ data });
  }

  async deleteMembership(userId: number, orgId: number) {
    await this.prismaClient.membership.delete({
      where: { userId_teamId: { userId, teamId: orgId } },
    });
  }

  async deleteMemberships(orgId: number, userIds: number[]) {
    await this.prismaClient.membership.deleteMany({
      where: { teamId: orgId, userId: { in: userIds } },
    });
  }

  updateMembershipRole(userId: number, orgId: number, role: MembershipRole) {
    return this.prismaClient.membership.update({
      where: { userId_teamId: { userId, teamId: orgId } },
      data: { role },
      select: { teamId: true, userId: true, role: true, accepted: true },
    });
  }

  async updateMembershipsRole(orgId: number, userIds: number[], role: MembershipRole) {
    await this.prismaClient.membership.updateMany({
      where: { teamId: orgId, userId: { in: userIds } },
      data: { role },
    });
  }

  // ── User ─────────────────────────────────────────────────────────────────────

  findUserByEmail(email: string) {
    return this.prismaClient.user.findUnique({
      where: { email },
      select: { id: true, locale: true },
    });
  }

  // ── Invite token ─────────────────────────────────────────────────────────────

  async createInviteToken(data: CreateInviteTokenData) {
    await this.prismaClient.verificationToken.create({ data });
  }
}
