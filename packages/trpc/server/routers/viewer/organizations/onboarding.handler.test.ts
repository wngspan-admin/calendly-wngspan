import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    membership: { findUnique: vi.fn() },
    team: { findFirst: vi.fn() },
    profile: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    publicRouteRedirect: { findUnique: vi.fn(), create: vi.fn() },
    organizationSettings: { update: vi.fn() },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import {
  completeOrganizationOnboardingHandler,
  updateOrganizationProfileSlugHandler,
} from "./onboarding.handler";

const ownerContext = { user: { id: 1 } };

describe("organization onboarding handlers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates the member slug and records a permanent route redirect", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      accepted: true,
      role: MembershipRole.OWNER,
    } as never);
    vi.mocked(prisma.team.findFirst).mockResolvedValue({ slug: "acme" } as never);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      id: 10,
      username: "old-owner",
    } as never);
    vi.mocked(prisma.profile.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.publicRouteRedirect.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.profile.update).mockResolvedValue({ id: 10, username: "alice" } as never);

    await updateOrganizationProfileSlugHandler({
      ctx: ownerContext,
      input: { organizationId: 5, username: "alice" },
    });

    expect(prisma.publicRouteRedirect.create).toHaveBeenCalledWith({
      data: {
        sourcePath: "/acme/users/old-owner",
        destinationPath: "/acme/users/alice",
        entityType: "MEMBER",
      },
    });
  });

  it("rejects onboarding changes from ordinary members", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      accepted: true,
      role: MembershipRole.MEMBER,
    } as never);

    await expect(
      completeOrganizationOnboardingHandler({
        ctx: ownerContext,
        input: { organizationId: 5 },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("records onboarding completion for an owner", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      accepted: true,
      role: MembershipRole.OWNER,
    } as never);
    vi.mocked(prisma.organizationSettings.update).mockResolvedValue({
      onboardingCompletedAt: new Date(),
    } as never);

    await completeOrganizationOnboardingHandler({
      ctx: ownerContext,
      input: { organizationId: 5 },
    });

    expect(prisma.organizationSettings.update).toHaveBeenCalledWith({
      where: { organizationId: 5 },
      data: { onboardingCompletedAt: expect.any(Date) },
      select: { onboardingCompletedAt: true },
    });
  });
});
