import { buildEmbedPath, buildTeamPath } from "@calcom/lib/publicRoutes";
import { getPublicRouteRedirect } from "@lib/publicRouteRedirect";
import type { PageProps } from "app/_types";
import { permanentRedirect } from "next/navigation";
import TeamEventEmbedPage from "../../../../[type]/embed/page";

export { generateMetadata } from "../../../../[type]/embed/page";

export default async function CanonicalTeamEventEmbedPage({ params, searchParams }: PageProps) {
  const { user: organizationSlug, team, type } = await params;
  if (typeof organizationSlug === "string" && typeof team === "string" && typeof type === "string") {
    const redirect = await getPublicRouteRedirect(
      buildEmbedPath(buildTeamPath(organizationSlug, team, type))
    );
    if (redirect) permanentRedirect(redirect);
  }
  return TeamEventEmbedPage({
    params: Promise.resolve({ user: team, teamSlug: team, type, orgSlug: organizationSlug }),
    searchParams,
  });
}
