import { buildEmbedPath, buildMemberPath } from "@calcom/lib/publicRoutes";
import { getPublicRouteRedirect } from "@lib/publicRouteRedirect";
import type { PageProps } from "app/_types";
import { permanentRedirect } from "next/navigation";
import MemberEmbedPage from "../../../embed/page";

export { generateMetadata } from "../../../embed/page";

export default async function CanonicalMemberEmbedPage({ params, searchParams }: PageProps) {
  const { user: organizationSlug, member } = await params;
  if (typeof organizationSlug === "string" && typeof member === "string") {
    const redirect = await getPublicRouteRedirect(buildEmbedPath(buildMemberPath(organizationSlug, member)));
    if (redirect) permanentRedirect(redirect);
  }
  return MemberEmbedPage({
    params: Promise.resolve({ user: member, orgSlug: organizationSlug }),
    searchParams,
  });
}
