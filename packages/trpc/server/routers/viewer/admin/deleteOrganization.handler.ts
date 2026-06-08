import { prisma } from "@calcom/prisma";

type Options = {
  input: { organizationId: number };
};

const deleteOrganizationHandler = async ({ input }: Options) => {
  await prisma.team.delete({ where: { id: input.organizationId } });
  return { success: true };
};

export default deleteOrganizationHandler;
