import { resolvePublicRouteRedirect } from "@calcom/lib/publicRoutes";
import { prisma } from "@calcom/prisma";

export const getPublicRouteRedirect = async (sourcePath: string) => {
  const redirects = await prisma.publicRouteRedirect.findMany({
    where: { enabled: true },
    select: {
      sourcePath: true,
      destinationPath: true,
      enabled: true,
    },
  });

  return resolvePublicRouteRedirect(sourcePath, redirects);
};
