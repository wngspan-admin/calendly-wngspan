import { buildTeamPath } from "@calcom/lib/publicRoutes";
import { prisma } from "@calcom/prisma";
import { notFound, permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string; type: string }>;
};

export default async function TeamEventTypePage({ params }: PageProps) {
  const { slug, type } = await params;

  const team = await prisma.team.findFirst({
    where: { slug, isOrganization: false, deletedAt: null, parent: { deletedAt: null } },
    select: { parent: { select: { slug: true } } },
  });
  if (!team?.parent?.slug) notFound();

  permanentRedirect(buildTeamPath(team.parent.slug, slug, type));
}
