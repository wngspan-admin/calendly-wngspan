import { getTranslation } from "@calcom/i18n/server";
import { buildTeamPath } from "@calcom/lib/publicRoutes";
import { prisma } from "@calcom/prisma";
import { getPublicRouteRedirect } from "@lib/publicRouteRedirect";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

const getTeam = async (organizationSlug: string, teamSlug: string) =>
  prisma.team.findFirst({
    where: {
      slug: teamSlug,
      isOrganization: false,
      deletedAt: null,
      parent: { slug: organizationSlug, isOrganization: true, deletedAt: null },
    },
    select: {
      name: true,
      slug: true,
      bio: true,
      parent: { select: { name: true, slug: true } },
      eventTypes: {
        where: { hidden: false },
        orderBy: { title: "asc" },
        select: { title: true, slug: true, description: true, length: true },
      },
    },
  });

type CanonicalTeamPageProps = {
  params: Promise<{ user: string; team: string }>;
};

export const generateMetadata = async ({ params }: CanonicalTeamPageProps): Promise<Metadata> => {
  const { user: organizationSlug, team: teamSlug } = await params;
  const redirect = await getPublicRouteRedirect(buildTeamPath(organizationSlug, teamSlug));
  if (redirect) permanentRedirect(redirect);
  const team = await getTeam(organizationSlug, teamSlug);
  if (!team) return { title: "Not Found" };

  return {
    title: `${team.name} | ${team.parent?.name ?? organizationSlug}`,
    description: team.bio,
  };
};

export default async function CanonicalTeamPage({ params }: CanonicalTeamPageProps) {
  const { user: organizationSlug, team: teamSlug } = await params;
  const team = await getTeam(organizationSlug, teamSlug);
  if (!team?.slug || !team.parent?.slug) notFound();
  const organization = team.parent;
  const currentTeamSlug = team.slug;
  if (!organization?.slug || !currentTeamSlug) notFound();
  const currentOrganizationSlug = organization.slug;
  const t = await getTranslation("en", "common");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-subtle">{team.parent.name}</p>
      <h1 className="mt-1 font-semibold text-3xl text-emphasis">{team.name}</h1>
      {team.bio && <p className="mt-2 text-default">{team.bio}</p>}

      <h2 className="mb-4 mt-10 font-semibold text-xl text-emphasis">{t("event_types")}</h2>
      <div className="space-y-3">
        {team.eventTypes.map((eventType) => (
          <Link
            className="block rounded-lg border border-subtle p-5 hover:bg-subtle"
            href={buildTeamPath(currentOrganizationSlug, currentTeamSlug, eventType.slug)}
            key={eventType.slug}>
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-medium text-emphasis">{eventType.title}</h3>
              <span className="text-sm text-subtle">{eventType.length} min</span>
            </div>
            {eventType.description && <p className="mt-1 text-sm text-subtle">{eventType.description}</p>}
          </Link>
        ))}
      </div>
    </main>
  );
}
