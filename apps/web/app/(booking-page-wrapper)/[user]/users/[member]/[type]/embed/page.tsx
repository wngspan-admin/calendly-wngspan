import { buildEmbedPath, buildMemberPath } from "@calcom/lib/publicRoutes";
import { getPublicRouteRedirect } from "@lib/publicRouteRedirect";
import type { PageProps } from "app/_types";
import { permanentRedirect } from "next/navigation";
import MemberEventEmbedPage from "../../../../[type]/embed/page";

export { generateMetadata } from "../../../../[type]/embed/page";

export default async function CanonicalMemberEventEmbedPage({ params, searchParams }: PageProps) {
  const { user: organizationSlug, member, type } = await params;
  if (typeof organizationSlug === "string" && typeof member === "string" && typeof type === "string") {
    const redirect = await getPublicRouteRedirect(
      buildEmbedPath(buildMemberPath(organizationSlug, member, type))
    );
    if (redirect) permanentRedirect(redirect);
  }
  return MemberEventEmbedPage({
    params: Promise.resolve({ user: member, type, orgSlug: organizationSlug }),
    searchParams,
  });
}
