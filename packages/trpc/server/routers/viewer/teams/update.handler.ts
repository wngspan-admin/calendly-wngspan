import { buildTeamPath } from "@calcom/lib/publicRoutes";
import { checkTeamPermission } from "@calcom/lib/teams/checkTeamPermission";
import prisma from "@calcom/prisma";
import { MembershipRole, PublicRouteEntityType } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TUpdateTeamInputSchema } from "./update.schema";

type UpdateTeamHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "organizationId">;
  };
  input: TUpdateTeamInputSchema;
};

export const updateTeamHandler = async ({ ctx, input }: UpdateTeamHandlerOptions) => {
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.ADMIN, ctx.user.organizationId);

  const { teamId, ...data } = input;

  if (!data.slug) return prisma.team.update({ where: { id: teamId }, data });

  const nextSlug = data.slug;
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUniqueOrThrow({
      where: { id: teamId, parentId: ctx.user.organizationId },
      select: {
        slug: true,
        parent: { select: { slug: true } },
      },
    });
    if (!team.parent?.slug) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Team must belong to an organization" });
    }

    const destinationPath = buildTeamPath(team.parent.slug, nextSlug);
    const [existing, historicalPath] = await Promise.all([
      tx.team.findFirst({
        where: {
          slug: nextSlug,
          parentId: ctx.user.organizationId,
          NOT: { id: teamId },
        },
        select: { id: true },
      }),
      tx.publicRouteRedirect.findUnique({
        where: { sourcePath: destinationPath },
        select: { id: true },
      }),
    ]);
    if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Slug already taken" });
    if (historicalPath && team.slug !== nextSlug) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Slug is reserved by a historical public route",
      });
    }

    if (team.slug && team.slug !== nextSlug) {
      await tx.publicRouteRedirect.create({
        data: {
          sourcePath: buildTeamPath(team.parent.slug, team.slug),
          destinationPath,
          entityType: PublicRouteEntityType.TEAM,
        },
      });
    }

    return tx.team.update({ where: { id: teamId }, data });
  });
};
