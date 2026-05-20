import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCreateOrgInputSchema } from "./create.schema";
import { ZGetOrgInputSchema } from "./get.schema";
import { ZUpdateOrgInputSchema } from "./update.schema";
import {
  ZBulkChangeOrgMemberRoleInputSchema,
  ZBulkRemoveOrgMembersInputSchema,
  ZChangeOrgMemberRoleInputSchema,
  ZGetOrgMembersInputSchema,
  ZRemoveOrgMemberInputSchema,
} from "./members.schema";

export const organizationsRouter = router({
  create: authedProcedure.input(ZCreateOrgInputSchema).mutation(async ({ ctx, input }) => {
    const { createOrganizationHandler } = await import("./create.handler");
    return createOrganizationHandler({ ctx, input });
  }),

  list: authedProcedure.query(async ({ ctx }) => {
    const { listOrganizationsHandler } = await import("./list.handler");
    return listOrganizationsHandler({ ctx });
  }),

  get: authedProcedure.input(ZGetOrgInputSchema).query(async ({ ctx, input }) => {
    const { getOrganizationHandler } = await import("./get.handler");
    return getOrganizationHandler({ ctx, input });
  }),

  update: authedProcedure.input(ZUpdateOrgInputSchema).mutation(async ({ ctx, input }) => {
    const { updateOrganizationHandler } = await import("./update.handler");
    return updateOrganizationHandler({ ctx, input });
  }),

  getMembers: authedProcedure.input(ZGetOrgMembersInputSchema).query(async ({ ctx, input }) => {
    const { getOrganizationMembersHandler } = await import("./members.handler");
    return getOrganizationMembersHandler({ ctx, input });
  }),

  removeMember: authedProcedure.input(ZRemoveOrgMemberInputSchema).mutation(async ({ ctx, input }) => {
    const { removeOrganizationMemberHandler } = await import("./members.handler");
    return removeOrganizationMemberHandler({ ctx, input });
  }),

  changeMemberRole: authedProcedure
    .input(ZChangeOrgMemberRoleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { changeOrganizationMemberRoleHandler } = await import("./members.handler");
      return changeOrganizationMemberRoleHandler({ ctx, input });
    }),

  bulkRemoveMembers: authedProcedure
    .input(ZBulkRemoveOrgMembersInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { bulkRemoveOrganizationMembersHandler } = await import("./members.handler");
      return bulkRemoveOrganizationMembersHandler({ ctx, input });
    }),

  bulkChangeMemberRole: authedProcedure
    .input(ZBulkChangeOrgMemberRoleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { bulkChangeOrganizationMemberRoleHandler } = await import("./members.handler");
      return bulkChangeOrganizationMemberRoleHandler({ ctx, input });
    }),
});
