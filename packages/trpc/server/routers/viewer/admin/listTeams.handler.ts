import prisma from "@calcom/prisma";

const listTeamsHandler = async () => {
  return prisma.team.findMany({
    where: { isOrganization: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: {
        select: { members: true },
      },
    },
  });
};

export default listTeamsHandler;
