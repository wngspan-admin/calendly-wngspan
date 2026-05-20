import { prisma } from "@calcom/prisma";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string; type: string }>;
};

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { slug, type } = await params;
  const team = await prisma.team.findFirst({ where: { slug, isOrganization: false } });
  if (!team) return { title: "Not Found" };

  const eventType = await prisma.eventType.findFirst({
    where: { slug: type, teamId: team.id },
    select: { title: true },
  });

  return { title: eventType ? `${eventType.title} | ${team.name}` : team.name };
};

export default async function TeamEventTypePage({ params }: PageProps) {
  const { slug, type } = await params;

  const team = await prisma.team.findFirst({
    where: { slug, isOrganization: false },
    select: { id: true, name: true, slug: true },
  });

  if (!team) notFound();

  const eventType = await prisma.eventType.findFirst({
    where: { slug: type, teamId: team.id },
    include: {
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
        <p className="text-sm text-default">{team.name}</p>
        <h1 className="mt-1 text-2xl font-semibold text-emphasis">{eventType.title}</h1>
        {eventType.description && (
          <p className="mt-2 text-sm text-default">{eventType.description}</p>
        )}
        <p className="mt-1 text-xs text-subtle">{eventType.length} min</p>
        {eventType.schedulingType && (
          <p className="mt-2 text-xs font-medium uppercase text-default">{eventType.schedulingType}</p>
        )}
        {eventType.hosts.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-default">Hosts</p>
            <ul className="mt-1 space-y-1">
              {eventType.hosts.map((h) => (
                <li key={h.user.id} className="text-sm text-emphasis">
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
