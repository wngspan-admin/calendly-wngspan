import { prisma } from "@calcom/prisma";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TeamEventTypeView from "~/bookings/views/team-event-type-view";

type PageProps = {
  params: Promise<{ slug: string; type: string }>;
};

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { slug, type } = await params;
  const team = await prisma.team.findFirst({
    where: { slug, isOrganization: false },
    select: { name: true },
  });
  if (!team) return { title: "Not Found" };

  const eventType = await prisma.eventType.findFirst({
    where: {
      slug: type,
      team: { slug, isOrganization: false },
    },
    select: { title: true },
  });

  return { title: eventType ? `${eventType.title} | ${team.name}` : team.name };
};

export default async function TeamEventTypePage({ params }: PageProps) {
  const { slug, type } = await params;

  const team = await prisma.team.findFirst({
    where: { slug, isOrganization: false },
    select: { id: true, slug: true },
  });
  if (!team) notFound();

  const eventType = await prisma.eventType.findFirst({
    where: { slug: type, teamId: team.id },
    select: { id: true },
  });
  if (!eventType) notFound();

  return <TeamEventTypeView teamSlug={slug} eventSlug={type} />;
}
