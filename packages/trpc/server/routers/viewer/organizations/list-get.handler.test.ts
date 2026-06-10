import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    team: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { getOrganizationHandler } from "./get.handler";
import { listOrganizationsHandler } from "./list.handler";

const userCtx = { user: { id: 1 } };
const outsiderCtx = { user: { id: 99 } };

const mockOrg = {
  id: 5,
  name: "Test Org",
  isOrganization: true,
  organizationSettings: null,
  members: [
    {
      role: MembershipRole.OWNER,
      user: { id: 1, name: "Owner", email: "owner@test.com", avatarUrl: null },
    },
  ],
};

describe("listOrganizationsHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns orgs where the caller is an accepted member", async () => {
    vi.mocked(prisma.team.findMany).mockResolvedValue([mockOrg] as never);

    const result = await listOrganizationsHandler({ ctx: userCtx });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(5);
    expect(prisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isOrganization: true,
          members: { some: { userId: 1, accepted: true } },
        }),
      })
    );
  });

  it("returns empty array when user has no org memberships", async () => {
    vi.mocked(prisma.team.findMany).mockResolvedValue([] as never);

    const result = await listOrganizationsHandler({ ctx: outsiderCtx });

    expect(result).toHaveLength(0);
  });
});

describe("getOrganizationHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns org when caller is an accepted member", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue(mockOrg as never);

    const result = await getOrganizationHandler({ ctx: userCtx, input: { organizationId: 5 } });

    expect(result.id).toBe(5);
    expect(result.name).toBe("Test Org");
  });

  it("throws NOT_FOUND when the org does not exist", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

    await expect(
      getOrganizationHandler({ ctx: userCtx, input: { organizationId: 999 } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws UNAUTHORIZED when caller is not a member of the org", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue(mockOrg as never);

    // outsiderCtx.user.id (99) is not in mockOrg.members
    await expect(
      getOrganizationHandler({ ctx: outsiderCtx, input: { organizationId: 5 } })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
