import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRedirect, mockGetServerSession } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
  mockGetServerSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({}),
  headers: vi.fn().mockResolvedValue({}),
}));

vi.mock("@calcom/features/auth/lib/getServerSession", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@lib/buildLegacyCtx", () => ({
  buildLegacyRequest: vi.fn().mockReturnValue({}),
}));

import { UserPermissionRole } from "@calcom/prisma/enums";

import { requireAdmin } from "./requireAdmin";

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users", async () => {
    mockGetServerSession.mockResolvedValue(null);
    await requireAdmin();
    expect(mockRedirect).toHaveBeenCalledWith("/settings/my-account/profile");
  });

  it("redirects non-admin users", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: UserPermissionRole.USER } });
    await requireAdmin();
    expect(mockRedirect).toHaveBeenCalledWith("/settings/my-account/profile");
  });

  it("allows admin users through without redirecting", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: UserPermissionRole.ADMIN } });
    await requireAdmin();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
