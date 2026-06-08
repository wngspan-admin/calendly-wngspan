import { prisma } from "@calcom/prisma";

type Options = {
  input: { teamId: number };
};

const deleteTeamHandler = async ({ input }: Options) => {
  await prisma.team.delete({ where: { id: input.teamId } });
  return { success: true };
};

export default deleteTeamHandler;
