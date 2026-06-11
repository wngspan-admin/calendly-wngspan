import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { redirect } from "next/navigation";
import OrganizationOnboardingView from "~/onboarding/organization/organization-onboarding-view";

const Page = async ({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) => {
  const session = await getServerSession();
  if (!session?.user?.id) redirect("/auth/login");

  const organizationId = Number((await searchParams).organizationId);
  if (!Number.isInteger(organizationId) || organizationId <= 0) redirect("/event-types");

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: organizationId } },
    select: {
      accepted: true,
      role: true,
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          bio: true,
          logoUrl: true,
          brandColor: true,
          darkBrandColor: true,
          organizationSettings: { select: { onboardingCompletedAt: true } },
          children: {
            where: { deletedAt: null },
            select: { id: true, name: true, slug: true },
            take: 1,
          },
          orgProfiles: {
            where: { userId: session.user.id },
            select: { username: true },
            take: 1,
          },
        },
      },
    },
  });

  if (
    !membership?.accepted ||
    (membership.role !== MembershipRole.OWNER && membership.role !== MembershipRole.ADMIN)
  ) {
    redirect("/event-types");
  }
  if (membership.team.organizationSettings?.onboardingCompletedAt) {
    redirect(`/settings/organizations/${organizationId}`);
  }

  return <OrganizationOnboardingView organization={membership.team} userEmail={session.user.email ?? ""} />;
};

export default Page;
