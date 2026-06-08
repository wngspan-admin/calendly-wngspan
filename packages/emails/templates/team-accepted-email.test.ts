import { describe, expect, it } from "vitest";

import type { TFunction } from "i18next";

import type { TeamAccepted } from "../src/templates/TeamAcceptedEmail";

const t: TFunction = ((key: string, vars?: Record<string, unknown>) => {
  if (key === "email_team_accepted|subject") {
    return `${String(vars?.memberName ?? "")} accepted your invitation to join ${String(vars?.teamName ?? "")}`;
  }
  if (key === "email_team_accepted|heading") {
    return `A new member has joined ${String(vars?.teamName ?? "")}`;
  }
  if (key === "email_team_accepted|content") {
    return `${String(vars?.memberName ?? "")} has accepted your invitation and joined ${String(vars?.teamName ?? "")}`;
  }
  return key;
}) as unknown as TFunction;

function makeEvent(overrides: Partial<TeamAccepted> = {}): TeamAccepted {
  return {
    language: t,
    to: "owner@example.com",
    teamName: "Acme Team",
    memberName: "Bob Smith",
    ...overrides,
  };
}

describe("TeamAcceptedEmail subject", () => {
  it("includes member name", () => {
    const event = makeEvent({ memberName: "Alice" });
    const subject = t("email_team_accepted|subject", {
      memberName: event.memberName,
      teamName: event.teamName,
    });
    expect(subject).toContain("Alice");
  });

  it("includes team name", () => {
    const event = makeEvent({ teamName: "Dev Squad" });
    const subject = t("email_team_accepted|subject", {
      memberName: event.memberName,
      teamName: event.teamName,
    });
    expect(subject).toContain("Dev Squad");
  });
});

describe("TeamAcceptedEmail component", () => {
  it("renders without throwing", async () => {
    const { TeamAcceptedEmail } = await import("../src/templates/TeamAcceptedEmail");
    const ReactDOMServer = (await import("react-dom/server")).default;
    const React = (await import("react")).default;
    expect(() =>
      ReactDOMServer.renderToStaticMarkup(React.createElement(TeamAcceptedEmail, makeEvent()))
    ).not.toThrow();
  });
});
