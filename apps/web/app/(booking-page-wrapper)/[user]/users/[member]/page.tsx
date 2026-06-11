import { WEBAPP_URL } from "@calcom/lib/constants";
import { buildMemberPath, buildMemberUrl } from "@calcom/lib/publicRoutes";
import { getPublicRouteRedirect } from "@lib/publicRouteRedirect";
import type { PageProps } from "app/_types";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import MemberPage, { generateMetadata as generateMemberMetadata } from "../../page";

type CanonicalMemberPageProps = {
  params: Promise<{ user: string; member: string }>;
  searchParams: PageProps["searchParams"];
};

const canonicalParams = async (params: CanonicalMemberPageProps["params"]) => {
  const { user: organizationSlug, member } = await params;
  return { user: member, orgSlug: organizationSlug };
};

export const generateMetadata = async ({
  params,
  searchParams,
}: CanonicalMemberPageProps): Promise<Metadata> => {
  const routeParams = await canonicalParams(params);
  const metadata = await generateMemberMetadata({ params: Promise.resolve(routeParams), searchParams });
  const canonicalUrl = buildMemberUrl(routeParams.orgSlug, routeParams.user, undefined, WEBAPP_URL);

  return {
    ...metadata,
    alternates: { ...metadata.alternates, canonical: canonicalUrl },
    openGraph: { ...metadata.openGraph, url: canonicalUrl },
  };
};

export default async function CanonicalMemberPage({ params, searchParams }: CanonicalMemberPageProps) {
  const routeParams = await canonicalParams(params);
  const redirect = await getPublicRouteRedirect(buildMemberPath(routeParams.orgSlug, routeParams.user));
  if (redirect) permanentRedirect(redirect);
  return MemberPage({ params: Promise.resolve(routeParams), searchParams });
}
