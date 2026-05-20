import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

import { canPerformAction, checkTeamPermission, getUserTeamRole } from "../teams/checkTeamPermission";

vi.mock("@calcom/prisma", () => ({
  default: {
    membership: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from "@calcom/prisma";

describe("checkTeamPermission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws Unauthorized if no membership found", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);
    await expect(checkTeamPermission(1, 1, "MEMBER")).rejects.toThrow(ErrorWithCode);
  });

  it("throws Unauthorized if membership not accepted", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      role: "MEMBER",
      accepted: false,
    } as any);
    await expect(checkTeamPermission(1, 1, "MEMBER")).rejects.toThrow(/Not a member/);
  });

  it("throws Forbidden if role is insufficient", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      role: "MEMBER",
      accepted: true,
    } as any);
    await expect(checkTeamPermission(1, 1, "ADMIN")).rejects.toThrow(/Requires ADMIN/);
  });

  it("resolves for exact role match", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      role: "ADMIN",
      accepted: true,
    } as any);
    await expect(checkTeamPermission(1, 1, "ADMIN")).resolves.toBeDefined();
  });

  it("resolves when user has higher role than required", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      role: "OWNER",
      accepted: true,
    } as any);
    await expect(checkTeamPermission(1, 1, "MEMBER")).resolves.toBeDefined();
  });
});

describe("getUserTeamRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when no membership found", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);
    expect(await getUserTeamRole(1, 1)).toBeNull();
  });

  it("returns null when membership is not accepted", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      role: "MEMBER",
      accepted: false,
    } as any);
    expect(await getUserTeamRole(1, 1)).toBeNull();
  });

  it("returns role when membership is accepted", async () => {
    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      role: "ADMIN",
      accepted: true,
    } as any);
    expect(await getUserTeamRole(1, 1)).toBe("ADMIN");
  });
});

describe("canPerformAction", () => {
  it("returns false for null role", () => {
    expect(canPerformAction(null, "MEMBER")).toBe(false);
  });

  it("MEMBER cannot perform ADMIN or OWNER actions", () => {
    expect(canPerformAction("MEMBER", "ADMIN")).toBe(false);
    expect(canPerformAction("MEMBER", "OWNER")).toBe(false);
  });

  it("MEMBER can perform MEMBER actions", () => {
    expect(canPerformAction("MEMBER", "MEMBER")).toBe(true);
  });

  it("ADMIN can perform MEMBER and ADMIN actions but not OWNER", () => {
    expect(canPerformAction("ADMIN", "MEMBER")).toBe(true);
    expect(canPerformAction("ADMIN", "ADMIN")).toBe(true);
    expect(canPerformAction("ADMIN", "OWNER")).toBe(false);
  });

  it("OWNER can perform all actions", () => {
    expect(canPerformAction("OWNER", "MEMBER")).toBe(true);
    expect(canPerformAction("OWNER", "ADMIN")).toBe(true);
    expect(canPerformAction("OWNER", "OWNER")).toBe(true);
  });
});
