import { prisma } from "@calcom/prisma";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TeamEventTypeView from "~/bookings/views/team-event-type-view";

type PageProps = {
  params: Promise<{ orgSlug: string; teamSlug: string; type: string }>;
};

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { orgSlug, teamSlug, type } = await params;

  const org = await prisma.team.findFirst({
    where: { slug: orgSlug, isOrganization: true },
    select: { id: true, name: true },
  });
  if (!org) return { title: "Not Found" };

  const team = await prisma.team.findFirst({
    where: { slug: teamSlug, parentId: org.id },
    select: { id: true, name: true },
  });
  if (!team) return { title: "Not Found" };

  const eventType = await prisma.eventType.findFirst({
    where: { slug: type, teamId: team.id },
    select: { title: true },
  });

  return { title: eventType ? `${eventType.title} | ${team.name} — ${org.name}` : team.name };
};

export default async function OrgTeamEventTypePage({ params }: PageProps) {
  const { orgSlug, teamSlug, type } = await params;

  const org = await prisma.team.findFirst({
    where: { slug: orgSlug, isOrganization: true },
    select: { id: true },
  });
  if (!org) notFound();

  const team = await prisma.team.findFirst({
    where: { slug: teamSlug, parentId: org.id },
    select: { id: true },
  });
  if (!team) notFound();

  const eventType = await prisma.eventType.findFirst({
    where: { slug: type, teamId: team.id },
    select: { id: true },
  });
  if (!eventType) notFound();

  return <TeamEventTypeView teamSlug={teamSlug} eventSlug={type} orgSlug={orgSlug} />;
}
