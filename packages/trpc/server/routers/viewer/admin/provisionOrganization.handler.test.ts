import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    team: { findFirst: vi.fn(), create: vi.fn() },
    membership: { create: vi.fn(), upsert: vi.fn() },
    profile: { create: vi.fn(), upsert: vi.fn() },
    publicRouteRedirect: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    verificationToken: { create: vi.fn() },
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

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: { generateProfileUid: vi.fn(() => "profile-uid") },
}));

vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "https://cal.wngspan.com",
}));

import prisma from "@calcom/prisma";
import { provisionOrganizationHandler } from "./provisionOrganization.handler";

const ctx = {
  user: {
    id: 1,
    name: "Instance Admin",
    email: "admin@wngspan.com",
  },
};

describe("provisionOrganizationHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.publicRouteRedirect.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.membership.create).mockResolvedValue({} as never);
    vi.mocked(prisma.membership.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.profile.create).mockResolvedValue({} as never);
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as never);
  });

  it("bootstraps the internal organization and profiles the admin in each organization", async () => {
    vi.mocked(prisma.team.findFirst).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    vi.mocked(prisma.team.create)
      .mockResolvedValueOnce({ id: 10 } as never)
      .mockResolvedValueOnce({ id: 20, name: "Acme", slug: "acme" } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 2,
      username: "alice",
      locale: "en",
    } as never);

    await provisionOrganizationHandler({
      ctx,
      input: { name: "Acme", slug: "acme", ownerEmail: "alice@acme.com" },
    });

    expect(prisma.team.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ slug: "wngspan", isOrganization: true }),
      })
    );
    expect(prisma.profile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: 1,
          organizationId: 10,
          username: "wngspan-admin-1",
        }),
      })
    );
    expect(prisma.profile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 1,
        organizationId: 20,
        username: "wngspan-admin-1",
      }),
    });
    expect(prisma.profile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 2,
        organizationId: 20,
        username: "alice",
      }),
    });
  });

  it("reuses an existing internal organization", async () => {
    vi.mocked(prisma.team.findFirst)
      .mockResolvedValueOnce({ id: 10 } as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.team.create).mockResolvedValueOnce({
      id: 20,
      name: "Acme",
      slug: "acme",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 1,
      username: "admin",
      locale: "en",
    } as never);

    await provisionOrganizationHandler({
      ctx,
      input: { name: "Acme", slug: "acme", ownerEmail: "admin@wngspan.com" },
    });

    expect(prisma.team.create).toHaveBeenCalledOnce();
    expect(prisma.membership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_teamId: { userId: 1, teamId: 10 } },
      })
    );
  });
});
