import { WEBAPP_URL } from "@calcom/lib/constants";
import { buildTeamPath, buildTeamUrl } from "@calcom/lib/publicRoutes";
import { getPublicRouteRedirect } from "@lib/publicRouteRedirect";
import type { PageProps } from "app/_types";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import TeamEventPage, { generateMetadata as generateTeamEventMetadata } from "../../../[type]/page";

type CanonicalTeamEventPageProps = {
  params: Promise<{ user: string; team: string; type: string }>;
  searchParams: PageProps["searchParams"];
};

const canonicalParams = async (params: CanonicalTeamEventPageProps["params"]) => {
  const { user: organizationSlug, team, type } = await params;
  return { user: team, teamSlug: team, type, orgSlug: organizationSlug };
};

export const generateMetadata = async ({
  params,
  searchParams,
}: CanonicalTeamEventPageProps): Promise<Metadata> => {
  const routeParams = await canonicalParams(params);
  const metadata = await generateTeamEventMetadata({
    params: Promise.resolve(routeParams),
    searchParams,
  });
  const canonicalUrl = buildTeamUrl(routeParams.orgSlug, routeParams.teamSlug, routeParams.type, WEBAPP_URL);

  return {
    ...metadata,
    alternates: { ...metadata.alternates, canonical: canonicalUrl },
    openGraph: { ...metadata.openGraph, url: canonicalUrl },
  };
};

export default async function CanonicalTeamEventPage({ params, searchParams }: CanonicalTeamEventPageProps) {
  const routeParams = await canonicalParams(params);
  const redirect = await getPublicRouteRedirect(
    buildTeamPath(routeParams.orgSlug, routeParams.teamSlug, routeParams.type)
  );
  if (redirect) permanentRedirect(redirect);
  return TeamEventPage({ params: Promise.resolve(routeParams), searchParams });
}
