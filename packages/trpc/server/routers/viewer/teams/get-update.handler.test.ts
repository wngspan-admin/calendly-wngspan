import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    team: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    publicRouteRedirect: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
  return { default: mockPrisma, prisma: mockPrisma };
});

vi.mock("@calcom/lib/teams/checkTeamPermission", () => ({
  checkTeamPermission: vi.fn().mockResolvedValue(undefined),
}));

import { ErrorWithCode } from "@calcom/lib/errors";
import { checkTeamPermission } from "@calcom/lib/teams/checkTeamPermission";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { changeMemberRoleHandler } from "./changeMemberRole.handler";
import { deleteTeamHandler } from "./delete.handler";
import { getTeamHandler } from "./get.handler";
import { removeMemberHandler } from "./removeMember.handler";
import { updateTeamHandler } from "./update.handler";

// Org A context (organizationId = 5)
const ownerCtxOrgA = { user: { id: 1, organizationId: 5 } };
const memberCtxOrgA = { user: { id: 3, organizationId: 5 } };
// Org B context (organizationId = 9) — cross-org attacker
const ownerCtxOrgB = { user: { id: 2, organizationId: 9 } };
// Standalone user (no org)
const outsiderCtx = { user: { id: 99, organizationId: null } };

// Team belonging to Org A (parentId = 5)
const mockTeamOrgA = {
  id: 10,
  name: "Test Team",
  slug: "test-team",
  isOrganization: false,
  parentId: 5,
  members: [
    {
      role: MembershipRole.OWNER,
      user: { id: 1, name: "Owner", email: "owner@test.com", avatarUrl: null },
    },
    {
      role: MembershipRole.MEMBER,
      user: { id: 3, name: "Member", email: "member@test.com", avatarUrl: null },
    },
  ],
};

// ── getTeamHandler ──────────────────────────────────────────────────────────

describe("getTeamHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns team when caller is an accepted member in the same org", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue(mockTeamOrgA as never);

    const result = await getTeamHandler({ ctx: ownerCtxOrgA, input: { teamId: 10 } });

    expect(result.id).toBe(10);
    expect(result.name).toBe("Test Team");
  });

  it("returns team for a non-owner member in the same org", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue(mockTeamOrgA as never);

    const result = await getTeamHandler({ ctx: memberCtxOrgA, input: { teamId: 10 } });

    expect(result.id).toBe(10);
  });

  it("throws NOT_FOUND when team does not exist", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

    await expect(getTeamHandler({ ctx: ownerCtxOrgA, input: { teamId: 999 } })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws UNAUTHORIZED when caller is not a member of the team", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue(mockTeamOrgA as never);

    // outsiderCtx.user.id (99) is not in mockTeamOrgA.members
    await expect(getTeamHandler({ ctx: outsiderCtx, input: { teamId: 10 } })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when a member of Org B requests a team in Org A", async () => {
    // Attacker (id=2) is listed as a member — the membership check passes — but org differs
    const teamWithAttacker = {
      ...mockTeamOrgA,
      members: [
        ...mockTeamOrgA.members,
        {
          role: MembershipRole.MEMBER,
          user: { id: 2, name: "Attacker", email: "a@b.com", avatarUrl: null },
        },
      ],
    };
    vi.mocked(prisma.team.findUnique).mockResolvedValue(teamWithAttacker as never);

    await expect(getTeamHandler({ ctx: ownerCtxOrgB, input: { teamId: 10 } })).rejects.toThrow(ErrorWithCode);
  });
});

// ── updateTeamHandler ───────────────────────────────────────────────────────

describe("updateTeamHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ADMIN can update team name within the same org", async () => {
    vi.mocked(checkTeamPermission).mockResolvedValue(undefined as never);
    vi.mocked(prisma.team.findFirst).mockResolvedValue(null); // no slug conflict
    vi.mocked(prisma.team.update).mockResolvedValue({ id: 10, name: "Updated Team" } as never);

    const result = await updateTeamHandler({
      ctx: ownerCtxOrgA,
      input: { teamId: 10, name: "Updated Team" },
    });

    expect(result.name).toBe("Updated Team");
    expect(prisma.team.update).toHaveBeenCalledOnce();
  });

  it("throws when checkTeamPermission rejects (non-ADMIN caller)", async () => {
    const { ErrorCode } = await import("@calcom/lib/errorCodes");
    vi.mocked(checkTeamPermission).mockRejectedValue(
      new ErrorWithCode(ErrorCode.Forbidden, "Requires ADMIN role")
    );

    await expect(
      updateTeamHandler({ ctx: memberCtxOrgA, input: { teamId: 10, name: "No Access" } })
    ).rejects.toThrow(ErrorWithCode);

    expect(prisma.team.update).not.toHaveBeenCalled();
  });

  it("throws when checkTeamPermission rejects (cross-org caller)", async () => {
    const { ErrorCode } = await import("@calcom/lib/errorCodes");
    vi.mocked(checkTeamPermission).mockRejectedValue(
      new ErrorWithCode(ErrorCode.Forbidden, "Team does not belong to your organization")
    );

    await expect(
      updateTeamHandler({ ctx: ownerCtxOrgB, input: { teamId: 10, name: "Cross-org attack" } })
    ).rejects.toThrow(ErrorWithCode);

    expect(prisma.team.update).not.toHaveBeenCalled();
  });

  it("throws BAD_REQUEST when new slug is already taken within the org", async () => {
    vi.mocked(checkTeamPermission).mockResolvedValue(undefined as never);
    vi.mocked(prisma.team.findUniqueOrThrow).mockResolvedValue({
      slug: "test-team",
      parent: { slug: "acme" },
    } as never);
    vi.mocked(prisma.team.findFirst).mockResolvedValue({ id: 99, slug: "taken-slug" } as never);
    vi.mocked(prisma.publicRouteRedirect.findUnique).mockResolvedValue(null);

    await expect(
      updateTeamHandler({ ctx: ownerCtxOrgA, input: { teamId: 10, slug: "taken-slug" } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(prisma.team.update).not.toHaveBeenCalled();
  });

  it("scopes slug conflict check to the caller's org (parentId)", async () => {
    vi.mocked(checkTeamPermission).mockResolvedValue(undefined as never);
    vi.mocked(prisma.team.findUniqueOrThrow).mockResolvedValue({
      slug: "test-team",
      parent: { slug: "acme" },
    } as never);
    vi.mocked(prisma.team.findFirst).mockResolvedValue(null); // no conflict
    vi.mocked(prisma.publicRouteRedirect.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.team.update).mockResolvedValue({ id: 10, name: "Team" } as never);

    await updateTeamHandler({ ctx: ownerCtxOrgA, input: { teamId: 10, slug: "my-slug" } });

    expect(prisma.team.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ parentId: 5 }),
      })
    );
  });
});

// ── deleteTeamHandler ───────────────────────────────────────────────────────

describe("deleteTeamHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("OWNER can delete their own org's team", async () => {
    vi.mocked(checkTeamPermission).mockResolvedValue(undefined as never);
    vi.mocked(prisma.team.delete).mockResolvedValue({ id: 10 } as never);

    await deleteTeamHandler({ ctx: ownerCtxOrgA, input: { teamId: 10 } });

    expect(prisma.team.delete).toHaveBeenCalledOnce();
  });

  it("throws when cross-org caller attempts delete", async () => {
    const { ErrorCode } = await import("@calcom/lib/errorCodes");
    vi.mocked(checkTeamPermission).mockRejectedValue(
      new ErrorWithCode(ErrorCode.Forbidden, "Team does not belong to your organization")
    );

    await expect(deleteTeamHandler({ ctx: ownerCtxOrgB, input: { teamId: 10 } })).rejects.toThrow(
      ErrorWithCode
    );

    expect(prisma.team.delete).not.toHaveBeenCalled();
  });

  it("passes organizationId to checkTeamPermission", async () => {
    vi.mocked(checkTeamPermission).mockResolvedValue(undefined as never);
    vi.mocked(prisma.team.delete).mockResolvedValue({ id: 10 } as never);

    await deleteTeamHandler({ ctx: ownerCtxOrgA, input: { teamId: 10 } });

    expect(checkTeamPermission).toHaveBeenCalledWith(1, 10, MembershipRole.OWNER, 5);
  });
});

// ── changeMemberRoleHandler ─────────────────────────────────────────────────

describe("changeMemberRoleHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("OWNER can change member role within same org", async () => {
    vi.mocked(checkTeamPermission).mockResolvedValue(undefined as never);
    vi.mocked(prisma.membership.update).mockResolvedValue({
      userId: 3,
      teamId: 10,
      role: MembershipRole.ADMIN,
    } as never);

    const result = await changeMemberRoleHandler({
      ctx: ownerCtxOrgA,
      input: { teamId: 10, memberId: 3, role: MembershipRole.ADMIN },
    });

    expect(result.role).toBe(MembershipRole.ADMIN);
  });

  it("throws when cross-org caller attempts role change", async () => {
    const { ErrorCode } = await import("@calcom/lib/errorCodes");
    vi.mocked(checkTeamPermission).mockRejectedValue(
      new ErrorWithCode(ErrorCode.Forbidden, "Team does not belong to your organization")
    );

    await expect(
      changeMemberRoleHandler({
        ctx: ownerCtxOrgB,
        input: { teamId: 10, memberId: 3, role: MembershipRole.ADMIN },
      })
    ).rejects.toThrow(ErrorWithCode);

    expect(prisma.membership.update).not.toHaveBeenCalled();
  });

  it("passes organizationId to checkTeamPermission", async () => {
    vi.mocked(checkTeamPermission).mockResolvedValue(undefined as never);
    vi.mocked(prisma.membership.update).mockResolvedValue({} as never);

    await changeMemberRoleHandler({
      ctx: ownerCtxOrgA,
      input: { teamId: 10, memberId: 3, role: MembershipRole.ADMIN },
    });

    expect(checkTeamPermission).toHaveBeenCalledWith(1, 10, MembershipRole.OWNER, 5);
  });
});

// ── removeMemberHandler ─────────────────────────────────────────────────────

describe("removeMemberHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ADMIN can remove a MEMBER from the same org's team", async () => {
    vi.mocked(checkTeamPermission).mockResolvedValue(undefined as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      userId: 3,
      teamId: 10,
      role: MembershipRole.MEMBER,
    } as never);
    vi.mocked(prisma.membership.delete).mockResolvedValue({} as never);

    await removeMemberHandler({ ctx: ownerCtxOrgA, input: { teamId: 10, memberId: 3 } });

    expect(prisma.membership.delete).toHaveBeenCalledOnce();
  });

  it("throws when cross-org caller attempts member removal", async () => {
    const { ErrorCode } = await import("@calcom/lib/errorCodes");
    vi.mocked(checkTeamPermission).mockRejectedValue(
      new ErrorWithCode(ErrorCode.Forbidden, "Team does not belong to your organization")
    );

    await expect(
      removeMemberHandler({ ctx: ownerCtxOrgB, input: { teamId: 10, memberId: 3 } })
    ).rejects.toThrow(ErrorWithCode);

    expect(prisma.membership.delete).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when target membership does not exist", async () => {
    vi.mocked(checkTeamPermission).mockResolvedValue(undefined as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);

    await expect(
      removeMemberHandler({ ctx: ownerCtxOrgA, input: { teamId: 10, memberId: 999 } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN when non-self removal of an OWNER is attempted", async () => {
    vi.mocked(checkTeamPermission).mockResolvedValue(undefined as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      userId: 1,
      teamId: 10,
      role: MembershipRole.OWNER,
    } as never);

    await expect(
      // memberCtxOrgA (id=3) tries to remove the OWNER (id=1)
      removeMemberHandler({ ctx: memberCtxOrgA, input: { teamId: 10, memberId: 1 } })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(prisma.membership.delete).not.toHaveBeenCalled();
  });

  it("passes organizationId to checkTeamPermission", async () => {
    vi.mocked(checkTeamPermission).mockResolvedValue(undefined as never);
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      userId: 3,
      teamId: 10,
      role: MembershipRole.MEMBER,
    } as never);
    vi.mocked(prisma.membership.delete).mockResolvedValue({} as never);

    await removeMemberHandler({ ctx: ownerCtxOrgA, input: { teamId: 10, memberId: 3 } });

    expect(checkTeamPermission).toHaveBeenCalledWith(1, 10, MembershipRole.ADMIN, 5);
  });
});
