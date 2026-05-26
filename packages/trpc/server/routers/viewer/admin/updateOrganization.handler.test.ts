import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    team: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import updateOrganizationHandler from "./updateOrganization.handler";

const mockOrg = {
  id: 1,
  name: "Acme Corp",
  slug: "acme",
  createdAt: new Date("2024-01-01"),
  organizationSettings: {
    orgAutoAcceptEmail: "acme.com",
    isOrganizationVerified: false,
  },
};

describe("updateOrganizationHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ id: 1, isOrganization: true } as never);
    vi.mocked(prisma.team.update).mockResolvedValue(mockOrg as never);
  });

  it("throws NOT_FOUND when organization does not exist", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

    await expect(
      updateOrganizationHandler({ input: { organizationId: 99 } })
    ).rejects.toThrow(TRPCError);
  });

  it("throws NOT_FOUND when team is not an organization", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ id: 1, isOrganization: false } as never);

    await expect(
      updateOrganizationHandler({ input: { organizationId: 1 } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updates name when provided", async () => {
    await updateOrganizationHandler({ input: { organizationId: 1, name: "New Name" } });

    expect(prisma.team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "New Name" }),
      })
    );
  });

  it("does not set name when not provided", async () => {
    await updateOrganizationHandler({ input: { organizationId: 1 } });

    const callData = vi.mocked(prisma.team.update).mock.calls[0][0].data;
    expect(callData).not.toHaveProperty("name");
  });

  it("upserts organizationSettings when isOrganizationVerified is provided", async () => {
    await updateOrganizationHandler({ input: { organizationId: 1, isOrganizationVerified: true } });

    const callData = vi.mocked(prisma.team.update).mock.calls[0][0].data;
    expect(callData.organizationSettings?.upsert?.update).toMatchObject({
      isOrganizationVerified: true,
    });
  });

  it("upserts organizationSettings when orgAutoAcceptEmail is provided", async () => {
    await updateOrganizationHandler({ input: { organizationId: 1, orgAutoAcceptEmail: "newdomain.com" } });

    const callData = vi.mocked(prisma.team.update).mock.calls[0][0].data;
    expect(callData.organizationSettings?.upsert?.update).toMatchObject({
      orgAutoAcceptEmail: "newdomain.com",
    });
  });

  it("does not set organizationSettings when neither settings field is provided", async () => {
    await updateOrganizationHandler({ input: { organizationId: 1, name: "Only Name" } });

    const callData = vi.mocked(prisma.team.update).mock.calls[0][0].data;
    expect(callData).not.toHaveProperty("organizationSettings");
  });

  it("returns updated organization data", async () => {
    const result = await updateOrganizationHandler({ input: { organizationId: 1, name: "Updated" } });
    expect(result).toEqual(mockOrg);
  });
});
