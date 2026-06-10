import { WEBAPP_URL } from "@calcom/lib/constants";
import { buildMemberPath, buildMemberUrl } from "@calcom/lib/publicRoutes";
import { getPublicRouteRedirect } from "@lib/publicRouteRedirect";
import type { PageProps } from "app/_types";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import MemberEventPage, { generateMetadata as generateMemberEventMetadata } from "../../../[type]/page";

type CanonicalMemberEventPageProps = {
  params: Promise<{ user: string; member: string; type: string }>;
  searchParams: PageProps["searchParams"];
};

const canonicalParams = async (params: CanonicalMemberEventPageProps["params"]) => {
  const { user: organizationSlug, member, type } = await params;
  return { user: member, type, orgSlug: organizationSlug };
};

export const generateMetadata = async ({
  params,
  searchParams,
}: CanonicalMemberEventPageProps): Promise<Metadata> => {
  const routeParams = await canonicalParams(params);
  const metadata = await generateMemberEventMetadata({
    params: Promise.resolve(routeParams),
    searchParams,
  });
  const canonicalUrl = buildMemberUrl(routeParams.orgSlug, routeParams.user, routeParams.type, WEBAPP_URL);

  return {
    ...metadata,
    alternates: { ...metadata.alternates, canonical: canonicalUrl },
    openGraph: { ...metadata.openGraph, url: canonicalUrl },
  };
};

export default async function CanonicalMemberEventPage({
  params,
  searchParams,
}: CanonicalMemberEventPageProps) {
  const routeParams = await canonicalParams(params);
  const redirect = await getPublicRouteRedirect(
    buildMemberPath(routeParams.orgSlug, routeParams.user, routeParams.type)
  );
  if (redirect) permanentRedirect(redirect);
  return MemberEventPage({ params: Promise.resolve(routeParams), searchParams });
}
