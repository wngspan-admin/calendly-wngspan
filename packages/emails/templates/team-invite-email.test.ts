import { describe, expect, it } from "vitest";

import type { TFunction } from "i18next";

import { getSubject, getTypeOfInvite } from "./team-invite-email";
import type { TeamInvite } from "./team-invite-email";

const t: TFunction = ((key: string, vars?: Record<string, unknown>) => {
  if (key.includes("added_to_org") || key.includes("invited_to_org")) {
    return `You have been invited to join organization ${String(vars?.team ?? "")}`;
  }
  if (key.includes("added_to_subteam") || key.includes("invited_to_subteam")) {
    return `You have been invited to join ${String(vars?.team ?? "")} in ${String(vars?.parentTeamName ?? "")}`;
  }
  return `You have been invited to join team ${String(vars?.team ?? "")}`;
}) as unknown as TFunction;

function makeInvite(overrides: Partial<TeamInvite> = {}): TeamInvite {
  return {
    language: t,
    from: "Alice",
    to: "bob@example.com",
    teamName: "Acme Team",
    joinLink: "https://example.com/join",
    isCalcomMember: true,
    isAutoJoin: false,
    isOrg: false,
    parentTeamName: undefined,
    isExistingUserMovedToOrg: false,
    prevLink: null,
    newLink: null,
    ...overrides,
  };
}

describe("getTypeOfInvite", () => {
  it("returns TO_ORG when isOrg is true", () => {
    expect(getTypeOfInvite(makeInvite({ isOrg: true }))).toBe("TO_ORG");
  });

  it("returns TO_SUBTEAM when parentTeamName is set", () => {
    expect(getTypeOfInvite(makeInvite({ parentTeamName: "Parent Org" }))).toBe("TO_SUBTEAM");
  });

  it("returns TO_REGULAR_TEAM for a plain team invite", () => {
    expect(getTypeOfInvite(makeInvite())).toBe("TO_REGULAR_TEAM");
  });

  it("throws when isAutoJoin is true on a regular team", () => {
    expect(() => getTypeOfInvite(makeInvite({ isAutoJoin: true }))).toThrow();
  });
});

describe("getSubject", () => {
  it("generates a subject for org invite", () => {
    const subject = getSubject(makeInvite({ isOrg: true, teamName: "Acme Org" }));
    expect(subject).toBeTruthy();
    expect(typeof subject).toBe("string");
  });

  it("generates a subject for subteam invite", () => {
    const subject = getSubject(makeInvite({ parentTeamName: "Acme Org", teamName: "Sales" }));
    expect(subject).toBeTruthy();
    expect(typeof subject).toBe("string");
  });

  it("generates a subject for regular team invite", () => {
    const subject = getSubject(makeInvite({ teamName: "Dev Team" }));
    expect(subject).toBeTruthy();
    expect(typeof subject).toBe("string");
  });
});
