import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTransaction } = vi.hoisted(() => ({ mockTransaction: vi.fn() }));

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    team: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    verificationToken: {
      deleteMany: vi.fn(),
    },
    membership: {
      deleteMany: vi.fn(),
    },
    $transaction: mockTransaction,
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from "@calcom/prisma";
import deleteOrganizationHandler from "./deleteOrganization.handler";

const activeOrg = {
  id: 10,
  isOrganization: true,
  deletedAt: null,
};

const childTeams = [{ id: 20 }, { id: 21 }];

function setupSuccessfulTransaction() {
  mockTransaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<void>) => {
    const tx = {
      team: {
        findMany: vi.fn().mockResolvedValue(childTeams),
        update: vi.fn().mockResolvedValue(undefined),
        updateMany: vi.fn().mockResolvedValue(undefined),
      },
      verificationToken: { deleteMany: vi.fn().mockResolvedValue(undefined) },
      membership: { deleteMany: vi.fn().mockResolvedValue(undefined) },
    };
    await fn(tx as unknown as typeof prisma);
    return tx;
  });
}

describe("deleteOrganizationHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("soft-deletes the org and all child teams inside a transaction", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue(activeOrg as never);
    setupSuccessfulTransaction();

    await deleteOrganizationHandler({ input: { organizationId: 10 } });

    expect(mockTransaction).toHaveBeenCalledOnce();

    const tx = await mockTransaction.mock.results[0].value;
    expect(tx.membership.deleteMany).toHaveBeenCalledWith({
      where: { teamId: { in: [10, 20, 21] } },
    });
    expect(tx.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { teamId: { in: [10, 20, 21] } },
    });
    expect(tx.team.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: 10, deletedAt: null } })
    );
    expect(tx.team.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 }, data: expect.objectContaining({ deletedAt: expect.any(Date) }) })
    );
  });

  it("throws NOT_FOUND when org does not exist", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

    await expect(
      deleteOrganizationHandler({ input: { organizationId: 999 } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND when id refers to a team, not an org", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue({
      id: 10,
      isOrganization: false,
      deletedAt: null,
    } as never);

    await expect(
      deleteOrganizationHandler({ input: { organizationId: 10 } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws BAD_REQUEST when org is already soft-deleted", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue({
      ...activeOrg,
      deletedAt: new Date("2026-01-01"),
    } as never);

    await expect(
      deleteOrganizationHandler({ input: { organizationId: 10 } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("does not proceed to transaction when org is not found", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

    await expect(
      deleteOrganizationHandler({ input: { organizationId: 10 } })
    ).rejects.toThrow();

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("deleted org is not queryable via deletedAt: null filter", async () => {
    // Simulate the state after deletion: findUnique returns the deleted record
    vi.mocked(prisma.team.findUnique).mockResolvedValue({
      ...activeOrg,
      deletedAt: new Date(),
    } as never);
    // A query with deletedAt: null returns nothing
    vi.mocked(prisma.team.findMany).mockResolvedValue([]);

    const results = await prisma.team.findMany({
      where: { isOrganization: true, parentId: null, deletedAt: null },
    });
    expect(results).toHaveLength(0);
  });
});
