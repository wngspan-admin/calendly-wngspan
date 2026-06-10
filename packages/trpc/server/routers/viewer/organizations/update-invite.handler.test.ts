import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    membership: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    team: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    publicRouteRedirect: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    verificationToken: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
  return { default: mockPrisma, prisma: mockPrisma };
});

vi.mock("@calcom/emails/organization-email-service", () => ({
  sendTeamInviteEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "http://localhost:3000",
}));

import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { inviteOrganizationMemberHandler } from "./members.handler";
import { updateOrganizationHandler } from "./update.handler";

const ownerCtx = { user: { id: 1, name: "Owner", email: "owner@test.com" } };
const adminCtx = { user: { id: 2, name: "Admin", email: "admin@test.com" } };
const memberCtx = { user: { id: 3, name: "Member", email: "member@test.com" } };
const outsiderCtx = { user: { id: 99, name: "Outsider", email: "outsider@test.com" } };

describe("updateOrganizationHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("OWNER can update org name and slug", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      role: MembershipRole.OWNER,
      accepted: true,
    } as never);
    vi.mocked(prisma.team.findUniqueOrThrow).mockResolvedValue({ slug: "old-org" } as never);
    vi.mocked(prisma.publicRouteRedirect.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.team.update).mockResolvedValue({
      id: 5,
      name: "Updated Org",
      slug: "updated-org",
      organizationSettings: null,
    } as never);

    const result = await updateOrganizationHandler({
      ctx: ownerCtx,
      input: { organizationId: 5, name: "Updated Org", slug: "updated-org" },
    });

    expect(result.name).toBe("Updated Org");
    expect(prisma.team.update).toHaveBeenCalledOnce();
    expect(prisma.publicRouteRedirect.create).toHaveBeenCalledWith({
      data: {
        sourcePath: "/old-org",
        destinationPath: "/updated-org",
        entityType: "ORGANIZATION",
      },
    });
  });

  it("ADMIN can update org", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      role: MembershipRole.ADMIN,
      accepted: true,
    } as never);
    vi.mocked(prisma.team.update).mockResolvedValue({
      id: 5,
      name: "By Admin",
      organizationSettings: null,
    } as never);

    await updateOrganizationHandler({
      ctx: adminCtx,
      input: { organizationId: 5, name: "By Admin" },
    });

    expect(prisma.team.update).toHaveBeenCalledOnce();
  });

  it("throws FORBIDDEN when caller is a MEMBER (not ADMIN or OWNER)", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      role: MembershipRole.MEMBER,
      accepted: true,
    } as never);

    await expect(
      updateOrganizationHandler({
        ctx: memberCtx,
        input: { organizationId: 5, name: "No Permission" },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(prisma.team.update).not.toHaveBeenCalled();
  });

  it("throws UNAUTHORIZED when caller is not a member", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);

    await expect(
      updateOrganizationHandler({
        ctx: outsiderCtx,
        input: { organizationId: 5, name: "No Access" },
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("inviteOrganizationMemberHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ADMIN can invite an existing user to the org", async () => {
    // First call: assertOrgMembership for actor
    vi.mocked(prisma.membership.findUnique)
      .mockResolvedValueOnce({ role: MembershipRole.ADMIN, accepted: true } as never)
      // Second call: check if invitee is already a member
      .mockResolvedValueOnce(null);

    vi.mocked(prisma.team.findUniqueOrThrow).mockResolvedValue({
      name: "Test Org",
      isOrganization: true,
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 42, locale: "en" } as never);
    vi.mocked(prisma.membership.create).mockResolvedValue({
      teamId: 5,
      userId: 42,
      role: MembershipRole.MEMBER,
      accepted: false,
    } as never);

    const result = await inviteOrganizationMemberHandler({
      ctx: adminCtx,
      input: { organizationId: 5, email: "newuser@test.com", role: MembershipRole.MEMBER },
    });

    expect(result).toMatchObject({ email: "newuser@test.com" });
    expect(prisma.membership.create).toHaveBeenCalledOnce();
  });

  it("ADMIN can invite a non-account email (sends signup link)", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      role: MembershipRole.ADMIN,
      accepted: true,
    } as never);
    vi.mocked(prisma.team.findUniqueOrThrow).mockResolvedValue({
      name: "Test Org",
      isOrganization: true,
    } as never);
    // User not found in DB
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.verificationToken.create).mockResolvedValue({} as never);

    const result = await inviteOrganizationMemberHandler({
      ctx: adminCtx,
      input: { organizationId: 5, email: "noone@external.com", role: MembershipRole.MEMBER },
    });

    expect(result).toEqual({ status: "invited", email: "noone@external.com" });
    expect(prisma.verificationToken.create).toHaveBeenCalledOnce();
  });

  it("throws BAD_REQUEST when invitee is already a member", async () => {
    vi.mocked(prisma.membership.findUnique)
      .mockResolvedValueOnce({ role: MembershipRole.ADMIN, accepted: true } as never)
      .mockResolvedValueOnce({ role: MembershipRole.MEMBER, accepted: true } as never);

    vi.mocked(prisma.team.findUniqueOrThrow).mockResolvedValue({
      name: "Test Org",
      isOrganization: true,
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 42, locale: "en" } as never);

    await expect(
      inviteOrganizationMemberHandler({
        ctx: adminCtx,
        input: { organizationId: 5, email: "existing@test.com", role: MembershipRole.MEMBER },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws FORBIDDEN when MEMBER tries to invite", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      role: MembershipRole.MEMBER,
      accepted: true,
    } as never);

    await expect(
      inviteOrganizationMemberHandler({
        ctx: memberCtx,
        input: { organizationId: 5, email: "new@test.com", role: MembershipRole.MEMBER },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
