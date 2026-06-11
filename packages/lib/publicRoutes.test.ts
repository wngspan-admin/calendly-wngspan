import { describe, expect, it } from "vitest";
import {
  buildAvatarPath,
  buildAvatarUrl,
  buildEmbedPath,
  buildMemberPath,
  buildMemberUrl,
  buildOrganizationPath,
  buildOrganizationUrl,
  buildTeamPath,
  isReservedOrganizationSlug,
  parsePublicRoute,
  resolvePublicRouteRedirect,
} from "./publicRoutes";

describe("publicRoutes", () => {
  it("builds canonical organization, member, team, embed, and avatar routes", () => {
    expect(buildOrganizationPath("acme")).toBe("/acme");
    expect(buildMemberPath("acme", "alice")).toBe("/acme/users/alice");
    expect(buildMemberPath("acme", "alice", "consultation")).toBe("/acme/users/alice/consultation");
    expect(buildTeamPath("acme", "sales", "demo")).toBe("/acme/teams/sales/demo");
    expect(buildEmbedPath("/acme/teams/sales/demo")).toBe("/acme/teams/sales/demo/embed");
    expect(buildAvatarPath({ organizationSlug: "acme" })).toBe("/acme/avatar.png");
    expect(buildAvatarPath({ organizationSlug: "acme", memberSlug: "alice" })).toBe(
      "/acme/users/alice/avatar.png"
    );
  });

  it("builds absolute URLs without duplicating or dropping path segments", () => {
    expect(buildOrganizationUrl("acme", "https://cal.wngspan.com")).toBe("https://cal.wngspan.com/acme");
    expect(buildMemberUrl("acme", "alice", "consultation", "https://cal.wngspan.com/base")).toBe(
      "https://cal.wngspan.com/acme/users/alice/consultation"
    );
    expect(buildAvatarUrl({ organizationSlug: "acme", teamSlug: "sales" }, "https://cal.wngspan.com")).toBe(
      "https://cal.wngspan.com/acme/teams/sales/avatar.png"
    );
  });

  it.each([
    ["/acme", { kind: "organization", organizationSlug: "acme", view: "profile" }],
    ["/acme/embed", { kind: "organization", organizationSlug: "acme", view: "embed" }],
    ["/acme/users/alice", { kind: "member", organizationSlug: "acme", memberSlug: "alice", view: "profile" }],
    [
      "/acme/users/alice/consultation",
      {
        kind: "member",
        organizationSlug: "acme",
        memberSlug: "alice",
        eventSlug: "consultation",
        view: "event",
      },
    ],
    [
      "https://cal.wngspan.com/acme/teams/sales/demo?month=2026-06",
      { kind: "team", organizationSlug: "acme", teamSlug: "sales", eventSlug: "demo", view: "event" },
    ],
    [
      "/acme/users/alice/consultation/embed",
      {
        kind: "member",
        organizationSlug: "acme",
        memberSlug: "alice",
        eventSlug: "consultation",
        view: "embed",
      },
    ],
    [
      "/acme/teams/sales/avatar.png",
      { kind: "team", organizationSlug: "acme", teamSlug: "sales", view: "avatar" },
    ],
  ])("parses %s", (path, expected) => {
    expect(parsePublicRoute(path)).toEqual(expected);
  });

  it("rejects application routes and malformed public routes", () => {
    expect(isReservedOrganizationSlug("Settings")).toBe(true);
    expect(parsePublicRoute("/settings")).toBeNull();
    expect(parsePublicRoute("/acme/users")).toBeNull();
    expect(parsePublicRoute("/acme/teams/sales/demo/extra")).toBeNull();
    expect(parsePublicRoute("/acme/teams/sales/demo/embed/extra")).toBeNull();
    expect(parsePublicRoute("/acme/%E0%A4%A")).toBeNull();
  });

  it("resolves redirect chains and rejects loops or excessive chains", () => {
    const redirects = [
      { sourcePath: "/old", destinationPath: "/older", enabled: true },
      { sourcePath: "/older", destinationPath: "/acme", enabled: true },
    ];
    expect(resolvePublicRouteRedirect("/old", redirects)).toBe("/acme");
    expect(resolvePublicRouteRedirect("/old/teams/sales/demo/embed", redirects)).toBe(
      "/acme/teams/sales/demo/embed"
    );
    expect(resolvePublicRouteRedirect("/missing", redirects)).toBeNull();
    expect(
      resolvePublicRouteRedirect("/a", [
        { sourcePath: "/a", destinationPath: "/b", enabled: true },
        { sourcePath: "/b", destinationPath: "/a", enabled: true },
      ])
    ).toBeNull();
    expect(resolvePublicRouteRedirect("/old", redirects, 1)).toBeNull();
  });
});
