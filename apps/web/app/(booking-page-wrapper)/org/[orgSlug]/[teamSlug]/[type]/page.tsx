import { prisma } from "@calcom/prisma";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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
    select: { id: true, name: true, slug: true },
  });

  if (!org) notFound();

  const team = await prisma.team.findFirst({
    where: { slug: teamSlug, parentId: org.id },
    select: { id: true, name: true, slug: true },
  });

  if (!team) notFound();

  const eventType = await prisma.eventType.findFirst({
    where: { slug: type, teamId: team.id },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      schedulingType: true,
      hosts: {
        select: {
          isFixed: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!eventType) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-lg border border-subtle bg-default p-8">
        <p className="text-subtle text-xs">{org.name}</p>
        <p className="text-default text-sm">{team.name}</p>
        <h1 className="mt-1 font-semibold text-2xl text-emphasis">{eventType.title}</h1>
        {eventType.description && <p className="mt-2 text-default text-sm">{eventType.description}</p>}
        <p className="mt-1 text-subtle text-xs">{eventType.length} min</p>
        {eventType.schedulingType && (
          <p className="mt-2 font-medium text-default text-xs uppercase">{eventType.schedulingType}</p>
        )}
        {eventType.hosts.length > 0 && (
          <div className="mt-4">
            <p className="font-medium text-default text-xs">Hosts</p>
            <ul className="mt-1 space-y-1">
              {eventType.hosts.map((h) => (
                <li key={h.user.id} className="text-emphasis text-sm">
                  {h.user.name ?? h.user.email}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
