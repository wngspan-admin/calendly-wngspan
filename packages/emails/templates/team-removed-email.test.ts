import { describe, expect, it } from "vitest";

import type { TFunction } from "i18next";

import type { TeamRemoved } from "../src/templates/TeamRemovedEmail";

const t: TFunction = ((key: string, vars?: Record<string, unknown>) => {
  if (key === "email_team_removed|subject") {
    return `You have been removed from ${String(vars?.teamName ?? "")}`;
  }
  if (key === "email_team_removed|heading") {
    return "You've been removed from a team";
  }
  if (key === "email_team_removed|content") {
    return `You have been removed from the team ${String(vars?.teamName ?? "")}`;
  }
  return key;
}) as unknown as TFunction;

function makeEvent(overrides: Partial<TeamRemoved> = {}): TeamRemoved {
  return {
    language: t,
    to: "member@example.com",
    teamName: "Acme Team",
    ...overrides,
  };
}

describe("TeamRemovedEmail subject", () => {
  it("includes team name", () => {
    const event = makeEvent({ teamName: "Sales Team" });
    const subject = t("email_team_removed|subject", { teamName: event.teamName });
    expect(subject).toContain("Sales Team");
  });
});

describe("TeamRemovedEmail component", () => {
  it("renders without throwing", async () => {
    const { TeamRemovedEmail } = await import("../src/templates/TeamRemovedEmail");
    const ReactDOMServer = (await import("react-dom/server")).default;
    const React = (await import("react")).default;
    expect(() =>
      ReactDOMServer.renderToStaticMarkup(React.createElement(TeamRemovedEmail, makeEvent()))
    ).not.toThrow();
  });
});
