import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import prisma from "@calcom/prisma";
import { checkTeamPermission } from "@calcom/lib/teams/checkTeamPermission";
import authedProcedure from "../../../procedures/authedProcedure";
import { createAuditMiddleware } from "../../../middlewares/auditLogMiddleware";
import { router } from "../../../trpc";

export const rolesRouter = router({
  list: authedProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { listRolesHandler } = await import("./list.handler");
      return listRolesHandler({ ctx, input });
    }),

  create: authedProcedure
    .use(createAuditMiddleware("role", "create"))
    .input(
      z.object({
        teamId: z.number(),
        name: z.string().min(1).max(64),
        description: z.string().max(255).optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { createRoleHandler } = await import("./create.handler");
      return createRoleHandler({ ctx, input });
    }),

  delete: authedProcedure
    .use(createAuditMiddleware("role", "delete"))
    .input(z.object({ teamId: z.number(), roleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { deleteRoleHandler } = await import("./delete.handler");
      return deleteRoleHandler({ ctx, input });
    }),

  addPermission: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
        roleId: z.string(),
        resource: z.string().min(1),
        action: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.ADMIN);

      const role = await prisma.role.findUnique({
        where: { id: input.roleId },
        select: { teamId: true },
      });
      if (!role || (role.teamId !== null && role.teamId !== input.teamId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }

      return prisma.rolePermission.upsert({
        where: { roleId_resource_action: { roleId: input.roleId, resource: input.resource, action: input.action } },
        create: { roleId: input.roleId, resource: input.resource, action: input.action },
        update: {},
        select: { id: true, resource: true, action: true },
      });
    }),

  removePermission: authedProcedure
    .input(
      z.object({
        teamId: z.number(),
        roleId: z.string(),
        resource: z.string().min(1),
        action: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.ADMIN);

      await prisma.rolePermission.deleteMany({
        where: { roleId: input.roleId, resource: input.resource, action: input.action },
      });
    }),
});
