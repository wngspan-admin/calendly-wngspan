import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    team: {
      findMany: vi.fn(),
    },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from "@calcom/prisma";
import listOrganizationsHandler from "./listOrganizations.handler";

const mockOrgs = [
  {
    id: 1,
    name: "Acme Corp",
    slug: "acme",
    createdAt: new Date("2024-01-01"),
    organizationSettings: { orgAutoAcceptEmail: "acme.com", isOrganizationVerified: true },
    _count: { members: 5, children: 2 },
  },
  {
    id: 2,
    name: "Beta Inc",
    slug: "beta",
    createdAt: new Date("2024-02-01"),
    organizationSettings: null,
    _count: { members: 1, children: 0 },
  },
];

describe("listOrganizationsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.team.findMany).mockResolvedValue(mockOrgs as never);
  });

  it("queries only top-level organizations", async () => {
    await listOrganizationsHandler();

    expect(prisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isOrganization: true, parentId: null },
      })
    );
  });

  it("orders by createdAt descending", async () => {
    await listOrganizationsHandler();

    expect(prisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("returns all organizations", async () => {
    const result = await listOrganizationsHandler();
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no organizations exist", async () => {
    vi.mocked(prisma.team.findMany).mockResolvedValue([]);
    const result = await listOrganizationsHandler();
    expect(result).toEqual([]);
  });
});
