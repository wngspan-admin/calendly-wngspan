import { createAuditMiddleware } from "../../../middlewares/auditLogMiddleware";
import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAcceptInviteInputSchema } from "./acceptInvite.schema";
import { ZChangeMemberRoleInputSchema } from "./changeMemberRole.schema";
import { ZCreateTeamInputSchema } from "./create.schema";
import { ZDeleteTeamInputSchema } from "./delete.schema";
import { ZGetTeamInputSchema } from "./get.schema";
import { ZGetTeamEventTypesInputSchema } from "./getEventTypes.schema";
import { ZGetMembersInputSchema } from "./getMembers.schema";
import { ZInviteMemberInputSchema } from "./inviteMember.schema";
import { ZRemoveMemberInputSchema } from "./removeMember.schema";
import { ZUpdateTeamInputSchema } from "./update.schema";

export const teamsRouter = router({
  create: authedProcedure.input(ZCreateTeamInputSchema).mutation(async ({ ctx, input }) => {
    const { createTeamHandler } = await import("./create.handler");
    return createTeamHandler({ ctx, input });
  }),

  list: authedProcedure.query(async ({ ctx }) => {
    const { listTeamsHandler } = await import("./list.handler");
    return listTeamsHandler({ ctx });
  }),

  get: authedProcedure.input(ZGetTeamInputSchema).query(async ({ ctx, input }) => {
    const { getTeamHandler } = await import("./get.handler");
    return getTeamHandler({ ctx, input });
  }),

  update: authedProcedure
    .use(createAuditMiddleware("team", "update"))
    .input(ZUpdateTeamInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { updateTeamHandler } = await import("./update.handler");
      return updateTeamHandler({ ctx, input });
    }),

  delete: authedProcedure
    .use(createAuditMiddleware("team", "delete"))
    .input(ZDeleteTeamInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { deleteTeamHandler } = await import("./delete.handler");
      return deleteTeamHandler({ ctx, input });
    }),

  inviteMember: authedProcedure
    .use(createAuditMiddleware("team", "invite"))
    .input(ZInviteMemberInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { inviteMemberHandler } = await import("./inviteMember.handler");
      return inviteMemberHandler({ ctx, input });
    }),

  removeMember: authedProcedure
    .use(createAuditMiddleware("team", "remove"))
    .input(ZRemoveMemberInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { removeMemberHandler } = await import("./removeMember.handler");
      return removeMemberHandler({ ctx, input });
    }),

  acceptInvite: authedProcedure.input(ZAcceptInviteInputSchema).mutation(async ({ ctx, input }) => {
    const { acceptInviteHandler } = await import("./acceptInvite.handler");
    return acceptInviteHandler({ ctx, input });
  }),

  changeMemberRole: authedProcedure
    .use(createAuditMiddleware("team", "changeMemberRole"))
    .input(ZChangeMemberRoleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { changeMemberRoleHandler } = await import("./changeMemberRole.handler");
      return changeMemberRoleHandler({ ctx, input });
    }),

  getMembers: authedProcedure.input(ZGetMembersInputSchema).query(async ({ ctx, input }) => {
    const { getMembersHandler } = await import("./getMembers.handler");
    return getMembersHandler({ ctx, input });
  }),

  getEventTypes: authedProcedure.input(ZGetTeamEventTypesInputSchema).query(async ({ ctx, input }) => {
    const { getTeamEventTypesHandler } = await import("./getEventTypes.handler");
    return getTeamEventTypesHandler({ ctx, input });
  }),
});
