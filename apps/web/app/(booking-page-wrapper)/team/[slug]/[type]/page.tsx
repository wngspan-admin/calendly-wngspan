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
