import { buildTeamPath } from "@calcom/lib/publicRoutes";
import { prisma } from "@calcom/prisma";
import { notFound, permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ orgSlug: string; teamSlug: string; type: string }>;
};

export default async function OrgTeamEventTypePage({ params }: PageProps) {
  const { orgSlug, teamSlug, type } = await params;

  const team = await prisma.team.findFirst({
    where: {
      slug: teamSlug,
      deletedAt: null,
      parent: { slug: orgSlug, isOrganization: true, deletedAt: null },
    },
    select: { id: true },
  });
  if (!team) notFound();

  permanentRedirect(buildTeamPath(orgSlug, teamSlug, type));
}
