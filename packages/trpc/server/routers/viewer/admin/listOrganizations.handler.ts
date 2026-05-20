import prisma from "@calcom/prisma";

const listOrganizationsHandler = async () => {
  return prisma.team.findMany({
    where: { isOrganization: true, parentId: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      organizationSettings: {
        select: {
          orgAutoAcceptEmail: true,
          isOrganizationVerified: true,
        },
      },
      _count: {
        select: { members: true, children: true },
      },
    },
  });
};

export default listOrganizationsHandler;
