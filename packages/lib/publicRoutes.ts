const PUBLIC_ROUTE_ORIGIN = "https://public-route.invalid";

export const RESERVED_ORGANIZATION_SLUGS = new Set([
  "api",
  "apps",
  "auth",
  "availability",
  "booking",
  "booking-successful",
  "bookings",
  "cancel",
  "d",
  "embed",
  "event-types",
  "getting-started",
  "help",
  "icons",
  "insights",
  "login",
  "logout",
  "org",
  "reschedule",
  "settings",
  "signup",
  "team",
  "video",
]);

type PublicRouteKind = "organization" | "member" | "team";

export type ParsedPublicRoute = {
  kind: PublicRouteKind;
  organizationSlug: string;
  memberSlug?: string;
  teamSlug?: string;
  eventSlug?: string;
  view: "profile" | "event" | "embed" | "avatar";
};

export type PublicRouteRedirectRecord = {
  sourcePath: string;
  destinationPath: string;
  enabled: boolean;
};

const segment = (value: string) => encodeURIComponent(value);

const appendOrigin = (path: string, origin?: string) => {
  if (!origin) return path;
  return new URL(path, origin.endsWith("/") ? origin : `${origin}/`).toString();
};

export const isReservedOrganizationSlug = (slug: string) =>
  RESERVED_ORGANIZATION_SLUGS.has(slug.trim().toLowerCase());

export const buildOrganizationPath = (organizationSlug: string) => `/${segment(organizationSlug)}`;

export const buildOrganizationUrl = (organizationSlug: string, origin?: string) =>
  appendOrigin(buildOrganizationPath(organizationSlug), origin);

export const buildMemberPath = (organizationSlug: string, memberSlug: string, eventSlug?: string) =>
  `${buildOrganizationPath(organizationSlug)}/users/${segment(memberSlug)}${
    eventSlug ? `/${segment(eventSlug)}` : ""
  }`;

export const buildMemberUrl = (
  organizationSlug: string,
  memberSlug: string,
  eventSlug?: string,
  origin?: string
) => appendOrigin(buildMemberPath(organizationSlug, memberSlug, eventSlug), origin);

export const buildTeamPath = (organizationSlug: string, teamSlug: string, eventSlug?: string) =>
  `${buildOrganizationPath(organizationSlug)}/teams/${segment(teamSlug)}${
    eventSlug ? `/${segment(eventSlug)}` : ""
  }`;

export const buildTeamUrl = (
  organizationSlug: string,
  teamSlug: string,
  eventSlug?: string,
  origin?: string
) => appendOrigin(buildTeamPath(organizationSlug, teamSlug, eventSlug), origin);

export const buildEmbedPath = (path: string) => `${path.replace(/\/$/, "")}/embed`;

export const buildEmbedUrl = (path: string, origin?: string) => appendOrigin(buildEmbedPath(path), origin);

export const buildAvatarPath = ({
  organizationSlug,
  memberSlug,
  teamSlug,
}: {
  organizationSlug: string;
  memberSlug?: string;
  teamSlug?: string;
}) => {
  if (memberSlug) return `${buildMemberPath(organizationSlug, memberSlug)}/avatar.png`;
  if (teamSlug) return `${buildTeamPath(organizationSlug, teamSlug)}/avatar.png`;
  return `${buildOrganizationPath(organizationSlug)}/avatar.png`;
};

export const buildAvatarUrl = (
  params: { organizationSlug: string; memberSlug?: string; teamSlug?: string },
  origin?: string
) => appendOrigin(buildAvatarPath(params), origin);

const decodeSegments = (pathname: string) => {
  try {
    return pathname
      .split("/")
      .filter(Boolean)
      .map((value) => decodeURIComponent(value));
  } catch {
    return null;
  }
};

export const parsePublicRoute = (input: string): ParsedPublicRoute | null => {
  const pathname = new URL(input, PUBLIC_ROUTE_ORIGIN).pathname.replace(/\/+$/, "");
  const parts = decodeSegments(pathname);
  if (!parts?.length || isReservedOrganizationSlug(parts[0])) return null;

  const [organizationSlug, collection, entitySlug, leaf, suffix, extra] = parts;
  if (extra) return null;

  if (!collection) {
    return { kind: "organization", organizationSlug, view: "profile" };
  }
  if (collection === "embed" && !entitySlug) {
    return { kind: "organization", organizationSlug, view: "embed" };
  }
  if (collection === "avatar.png" && !entitySlug) {
    return { kind: "organization", organizationSlug, view: "avatar" };
  }
  if ((collection !== "users" && collection !== "teams") || !entitySlug) return null;

  const entity =
    collection === "users"
      ? { kind: "member" as const, memberSlug: entitySlug }
      : {
          kind: "team" as const,
          teamSlug: entitySlug,
        };

  if (!leaf && !suffix) return { ...entity, organizationSlug, view: "profile" };
  if (leaf === "embed" && !suffix) return { ...entity, organizationSlug, view: "embed" };
  if (leaf === "avatar.png" && !suffix) return { ...entity, organizationSlug, view: "avatar" };
  if (leaf && suffix === "embed") {
    return { ...entity, organizationSlug, eventSlug: leaf, view: "embed" };
  }
  if (suffix) return null;

  return { ...entity, organizationSlug, eventSlug: leaf, view: "event" };
};

export const resolvePublicRouteRedirect = (
  sourcePath: string,
  redirects: PublicRouteRedirectRecord[],
  maxHops = 10
) => {
  const redirectsBySource = new Map(
    redirects.filter((redirect) => redirect.enabled).map((redirect) => [redirect.sourcePath, redirect])
  );
  const visited = new Set<string>();
  let destinationPath = sourcePath;

  for (let hop = 0; hop < maxHops; hop++) {
    if (visited.has(destinationPath)) return null;
    visited.add(destinationPath);

    const redirectSource = Array.from(redirectsBySource.keys())
      .filter((candidate) => destinationPath === candidate || destinationPath.startsWith(`${candidate}/`))
      .sort((left, right) => right.length - left.length)[0];
    const redirect = redirectSource ? redirectsBySource.get(redirectSource) : null;
    if (!redirect) return destinationPath === sourcePath ? null : destinationPath;
    destinationPath = `${redirect.destinationPath}${destinationPath.slice(redirect.sourcePath.length)}`;
  }

  return null;
};
