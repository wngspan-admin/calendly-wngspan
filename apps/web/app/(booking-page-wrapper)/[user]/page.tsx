import { WEBAPP_URL } from "@calcom/lib/constants";
import { buildOrganizationPath, buildOrganizationUrl } from "@calcom/lib/publicRoutes";
import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getPublicRouteRedirect } from "@lib/publicRouteRedirect";
import { getServerSideProps } from "@server/lib/[user]/getServerSideProps";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { permanentRedirect } from "next/navigation";
import type { PageProps as LegacyPageProps } from "~/users/views/users-public-view";
import LegacyPage from "~/users/views/users-public-view";
import { getOrganizationDirectory, OrganizationDirectory } from "./OrganizationDirectory";

const getData: (ctx: ReturnType<typeof buildLegacyCtx>) => Promise<LegacyPageProps> =
  withAppDirSsr<LegacyPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps): Promise<JSX.Element> => {
  const user = decodeParams(await params).user;
  if (typeof user === "string") {
    const redirect = await getPublicRouteRedirect(buildOrganizationPath(user));
    if (redirect) permanentRedirect(redirect);
  }
  const organization = typeof user === "string" ? await getOrganizationDirectory(user) : null;
  if (organization) return (await OrganizationDirectory({ organization })) ?? <></>;

  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  return <LegacyPage {...props} />;
};

export const generateMetadata = async ({ params, searchParams }: PageProps): Promise<Metadata> => {
  const decodedParams = decodeParams(await params);
  const organization =
    typeof decodedParams.user === "string" ? await getOrganizationDirectory(decodedParams.user) : null;
  if (organization) {
    const canonicalUrl = buildOrganizationUrl(organization.slug ?? "", WEBAPP_URL);
    return {
      title: organization.name,
      description: organization.bio,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: organization.name,
        description: organization.bio ?? undefined,
        images: organization.logoUrl ? [organization.logoUrl] : undefined,
        url: canonicalUrl,
      },
    };
  }

  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  const { profile, markdownStrippedBio, isOrgSEOIndexable } = props;
  const isOrg = !!profile?.organization;
  const allowSEOIndexing =
    (!isOrg && profile.allowSEOIndexing) || (isOrg && isOrgSEOIndexable && profile.allowSEOIndexing);

  const meeting = {
    title: markdownStrippedBio,
    profile: { name: `${profile.name}`, image: profile.image },
    users: [{ username: `${profile.username}`, name: `${profile.name}` }],
  };
  const metadata = await generateMeetingMetadata(
    meeting,
    () => profile.name,
    () => markdownStrippedBio,
    false,
    WEBAPP_URL,
    `/${decodeParams(await params).user}`
  );

  return {
    ...metadata,
    robots: {
      follow: allowSEOIndexing,
      index: allowSEOIndexing,
    },
  };
};

export default ServerPage;
