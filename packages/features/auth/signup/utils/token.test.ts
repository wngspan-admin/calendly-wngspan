import { describe, expect, it } from "vitest";
import { extractTeamInviteRole } from "./token";

describe("extractTeamInviteRole", () => {
  it("returns MEMBER for a MEMBER invite identifier", () => {
    expect(extractTeamInviteRole("team-invite:MEMBER:bob@example.com")).toBe("MEMBER");
  });

  it("returns ADMIN for an ADMIN invite identifier", () => {
    expect(extractTeamInviteRole("team-invite:ADMIN:alice@example.com")).toBe("ADMIN");
  });

  it("returns OWNER for an OWNER invite identifier", () => {
    expect(extractTeamInviteRole("team-invite:OWNER:owner@example.com")).toBe("OWNER");
  });

  it("returns null for a non-team-invite identifier", () => {
    expect(extractTeamInviteRole("some-identifier")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractTeamInviteRole("")).toBeNull();
  });

  it("returns null for an identifier with an invalid role", () => {
    expect(extractTeamInviteRole("team-invite:SUPERADMIN:bob@example.com")).toBeNull();
  });

  it("returns null for a partial match without trailing colon", () => {
    expect(extractTeamInviteRole("team-invite:MEMBER")).toBeNull();
  });
});
