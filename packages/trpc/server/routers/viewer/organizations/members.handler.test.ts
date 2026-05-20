import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    membership: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import {
  bulkChangeOrganizationMemberRoleHandler,
  bulkRemoveOrganizationMembersHandler,
  changeOrganizationMemberRoleHandler,
  getOrganizationMembersHandler,
  removeOrganizationMemberHandler,
} from "./members.handler";

const ownerCtx = { user: { id: 1 } };
const adminCtx = { user: { id: 2 } };
const memberCtx = { user: { id: 3 } };
const outsiderCtx = { user: { id: 99 } };

function mockActorMembership(role: MembershipRole | null) {
  vi.mocked(prisma.membership.findUnique).mockImplementation(({ where }) => {
    const uid = (where as { userId_teamId: { userId: number } }).userId_teamId.userId;
    if (uid === ownerCtx.user.id) return Promise.resolve({ role: MembershipRole.OWNER, accepted: true } as never);
    if (uid === adminCtx.user.id) return Promise.resolve({ role: MembershipRole.ADMIN, accepted: true } as never);
    if (uid === memberCtx.user.id) return Promise.resolve({ role: MembershipRole.MEMBER, accepted: true } as never);
    if (role) return Promise.resolve({ role, accepted: true } as never);
    return Promise.resolve(null);
  });
}

describe("getOrganizationMembersHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns members when caller is a member", async () => {
    mockActorMembership(MembershipRole.MEMBER);
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      { role: MembershipRole.MEMBER, accepted: true, user: { id: 10, email: "a@test.com", name: "A", username: "a", avatarUrl: null } },
    ] as never);

    const result = await getOrganizationMembersHandler({ ctx: memberCtx, input: { organizationId: 5 } });
    expect(result).toHaveLength(1);
  });

  it("throws FORBIDDEN when caller is not a member", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);

    await expect(
      getOrganizationMembersHandler({ ctx: outsiderCtx, input: { organizationId: 5 } })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN when membership is not accepted", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ role: MembershipRole.MEMBER, accepted: false } as never);

    await expect(
      getOrganizationMembersHandler({ ctx: memberCtx, input: { organizationId: 5 } })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("removeOrganizationMemberHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows ADMIN to remove a MEMBER", async () => {
    mockActorMembership(null);
    vi.mocked(prisma.membership.findUnique)
      .mockResolvedValueOnce({ role: MembershipRole.ADMIN, accepted: true } as never)
      .mockResolvedValueOnce({ role: MembershipRole.MEMBER } as never);
    vi.mocked(prisma.membership.delete).mockResolvedValue({} as never);

    await removeOrganizationMemberHandler({ ctx: adminCtx, input: { organizationId: 5, memberId: 10 } });
    expect(prisma.membership.delete).toHaveBeenCalledOnce();
  });

  it("throws FORBIDDEN when ADMIN tries to remove another ADMIN", async () => {
    vi.mocked(prisma.membership.findUnique)
      .mockResolvedValueOnce({ role: MembershipRole.ADMIN, accepted: true } as never)
      .mockResolvedValueOnce({ role: MembershipRole.ADMIN } as never);

    await expect(
      removeOrganizationMemberHandler({ ctx: adminCtx, input: { organizationId: 5, memberId: 20 } })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN when MEMBER tries to remove anyone", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ role: MembershipRole.MEMBER, accepted: true } as never);

    await expect(
      removeOrganizationMemberHandler({ ctx: memberCtx, input: { organizationId: 5, memberId: 10 } })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when target membership does not exist", async () => {
    vi.mocked(prisma.membership.findUnique)
      .mockResolvedValueOnce({ role: MembershipRole.ADMIN, accepted: true } as never)
      .mockResolvedValueOnce(null);

    await expect(
      removeOrganizationMemberHandler({ ctx: adminCtx, input: { organizationId: 5, memberId: 99 } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("changeOrganizationMemberRoleHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows OWNER to change a member's role", async () => {
    vi.mocked(prisma.membership.findUnique)
      .mockResolvedValueOnce({ role: MembershipRole.OWNER, accepted: true } as never)
      .mockResolvedValueOnce({ role: MembershipRole.MEMBER } as never);
    vi.mocked(prisma.membership.update).mockResolvedValue({ role: MembershipRole.ADMIN } as never);

    await changeOrganizationMemberRoleHandler({
      ctx: ownerCtx,
      input: { organizationId: 5, memberId: 10, role: MembershipRole.ADMIN },
    });

    expect(prisma.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: MembershipRole.ADMIN } })
    );
  });

  it("throws FORBIDDEN when ADMIN tries to change roles", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ role: MembershipRole.ADMIN, accepted: true } as never);

    await expect(
      changeOrganizationMemberRoleHandler({
        ctx: adminCtx,
        input: { organizationId: 5, memberId: 10, role: MembershipRole.MEMBER },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when target membership does not exist", async () => {
    vi.mocked(prisma.membership.findUnique)
      .mockResolvedValueOnce({ role: MembershipRole.OWNER, accepted: true } as never)
      .mockResolvedValueOnce(null);

    await expect(
      changeOrganizationMemberRoleHandler({
        ctx: ownerCtx,
        input: { organizationId: 5, memberId: 99, role: MembershipRole.MEMBER },
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("bulkRemoveOrganizationMembersHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes multiple members when actor is ADMIN and all targets are MEMBERs", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ role: MembershipRole.ADMIN, accepted: true } as never);
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      { userId: 10, role: MembershipRole.MEMBER },
      { userId: 11, role: MembershipRole.MEMBER },
    ] as never);
    vi.mocked(prisma.membership.deleteMany).mockResolvedValue({ count: 2 } as never);

    const result = await bulkRemoveOrganizationMembersHandler({
      ctx: adminCtx,
      input: { organizationId: 5, memberIds: [10, 11] },
    });

    expect(result).toEqual({ success: true, removedCount: 2 });
    expect(prisma.membership.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teamId: 5, userId: { in: [10, 11] } } })
    );
  });

  it("throws FORBIDDEN when ADMIN tries to bulk-remove another ADMIN", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ role: MembershipRole.ADMIN, accepted: true } as never);
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      { userId: 20, role: MembershipRole.ADMIN },
    ] as never);

    await expect(
      bulkRemoveOrganizationMembersHandler({
        ctx: adminCtx,
        input: { organizationId: 5, memberIds: [20] },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(prisma.membership.deleteMany).not.toHaveBeenCalled();
  });

  it("throws FORBIDDEN when non-member tries to bulk-remove", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);

    await expect(
      bulkRemoveOrganizationMembersHandler({
        ctx: outsiderCtx,
        input: { organizationId: 5, memberIds: [10] },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows OWNER to bulk-remove ADMINs", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ role: MembershipRole.OWNER, accepted: true } as never);
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      { userId: 20, role: MembershipRole.ADMIN },
    ] as never);
    vi.mocked(prisma.membership.deleteMany).mockResolvedValue({ count: 1 } as never);

    const result = await bulkRemoveOrganizationMembersHandler({
      ctx: ownerCtx,
      input: { organizationId: 5, memberIds: [20] },
    });

    expect(result.removedCount).toBe(1);
  });
});

describe("bulkChangeOrganizationMemberRoleHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates role for all target members when actor is OWNER", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ role: MembershipRole.OWNER, accepted: true } as never);
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      { userId: 10 },
      { userId: 11 },
    ] as never);
    vi.mocked(prisma.membership.updateMany).mockResolvedValue({ count: 2 } as never);

    const result = await bulkChangeOrganizationMemberRoleHandler({
      ctx: ownerCtx,
      input: { organizationId: 5, memberIds: [10, 11], role: MembershipRole.ADMIN },
    });

    expect(result).toEqual({ success: true, updatedCount: 2 });
    expect(prisma.membership.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: MembershipRole.ADMIN } })
    );
  });

  it("throws FORBIDDEN when ADMIN tries to bulk change roles", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ role: MembershipRole.ADMIN, accepted: true } as never);

    await expect(
      bulkChangeOrganizationMemberRoleHandler({
        ctx: adminCtx,
        input: { organizationId: 5, memberIds: [10], role: MembershipRole.MEMBER },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when none of the memberIds exist", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({ role: MembershipRole.OWNER, accepted: true } as never);
    vi.mocked(prisma.membership.findMany).mockResolvedValue([] as never);

    await expect(
      bulkChangeOrganizationMemberRoleHandler({
        ctx: ownerCtx,
        input: { organizationId: 5, memberIds: [999], role: MembershipRole.MEMBER },
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
