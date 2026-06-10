import { getTranslation } from "@calcom/i18n/server";
import { buildMemberPath, buildTeamPath } from "@calcom/lib/publicRoutes";
import { prisma } from "@calcom/prisma";
import Image from "next/image";
import Link from "next/link";

export const getOrganizationDirectory = (slug: string) =>
  prisma.team.findFirst({
    where: { slug, isOrganization: true, parentId: null, deletedAt: null },
    select: {
      name: true,
      slug: true,
      bio: true,
      logoUrl: true,
      bannerUrl: true,
      children: {
        where: { isListed: true, deletedAt: null, slug: { not: null } },
        orderBy: { name: "asc" },
        select: { name: true, slug: true, bio: true },
      },
      orgProfiles: {
        where: { isListed: true },
        orderBy: { username: "asc" },
        select: {
          username: true,
          user: { select: { name: true, bio: true } },
        },
      },
    },
  });

type OrganizationDirectoryProps = {
  organization: NonNullable<Awaited<ReturnType<typeof getOrganizationDirectory>>>;
};

export async function OrganizationDirectory({ organization }: OrganizationDirectoryProps) {
  const t = await getTranslation("en", "common");
  const organizationSlug = organization.slug;
  if (!organizationSlug) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {organization.bannerUrl && (
        <Image
          alt=""
          className="mb-8 h-48 w-full rounded-xl object-cover"
          height={192}
          src={organization.bannerUrl}
          unoptimized
          width={1024}
        />
      )}
      <section className="mb-10 flex items-start gap-5">
        {organization.logoUrl && (
          <Image
            alt=""
            className="h-20 w-20 rounded-xl object-cover"
            height={80}
            src={organization.logoUrl}
            unoptimized
            width={80}
          />
        )}
        <div>
          <h1 className="font-semibold text-3xl text-emphasis">{organization.name}</h1>
          {organization.bio && <p className="mt-2 max-w-2xl text-default">{organization.bio}</p>}
        </div>
      </section>

      {organization.children.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-semibold text-xl text-emphasis">{t("organization_directory_teams")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {organization.children.map((team) => (
              <Link
                className="rounded-lg border border-subtle p-5 hover:bg-subtle"
                href={buildTeamPath(organizationSlug, team.slug ?? "")}
                key={team.slug}>
                <h3 className="font-medium text-emphasis">{team.name}</h3>
                {team.bio && <p className="mt-1 text-sm text-subtle">{team.bio}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {organization.orgProfiles.length > 0 && (
        <section>
          <h2 className="mb-4 font-semibold text-xl text-emphasis">{t("organization_directory_members")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {organization.orgProfiles.map((profile) => (
              <Link
                className="rounded-lg border border-subtle p-5 hover:bg-subtle"
                href={buildMemberPath(organizationSlug, profile.username)}
                key={profile.username}>
                <h3 className="font-medium text-emphasis">{profile.user.name ?? profile.username}</h3>
                {profile.user.bio && <p className="mt-1 text-sm text-subtle">{profile.user.bio}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
