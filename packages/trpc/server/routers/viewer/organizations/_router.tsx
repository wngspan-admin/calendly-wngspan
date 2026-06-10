import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAcceptOrganizationInviteSchema } from "./acceptInvite.schema";
import { ZGetOrgInputSchema } from "./get.schema";
import {
  ZBulkChangeOrgMemberRoleInputSchema,
  ZBulkRemoveOrgMembersInputSchema,
  ZChangeOrgMemberRoleInputSchema,
  ZGetOrgMembersInputSchema,
  ZInviteOrgMemberInputSchema,
  ZRemoveOrgMemberInputSchema,
  ZUpdateOrgMemberListingInputSchema,
} from "./members.schema";
import {
  ZCompleteOrganizationOnboardingSchema,
  ZUpdateOrganizationProfileSlugSchema,
} from "./onboarding.schema";
import { ZUpdateOrgInputSchema } from "./update.schema";

export const organizationsRouter = router({
  acceptInvite: authedProcedure.input(ZAcceptOrganizationInviteSchema).mutation(async ({ ctx, input }) => {
    const { acceptOrganizationInviteHandler } = await import("./acceptInvite.handler");
    return acceptOrganizationInviteHandler({ ctx, input });
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

  updateProfileSlug: authedProcedure
    .input(ZUpdateOrganizationProfileSlugSchema)
    .mutation(async ({ ctx, input }) => {
      const { updateOrganizationProfileSlugHandler } = await import("./onboarding.handler");
      return updateOrganizationProfileSlugHandler({ ctx, input });
    }),

  completeOnboarding: authedProcedure
    .input(ZCompleteOrganizationOnboardingSchema)
    .mutation(async ({ ctx, input }) => {
      const { completeOrganizationOnboardingHandler } = await import("./onboarding.handler");
      return completeOrganizationOnboardingHandler({ ctx, input });
    }),

  inviteMember: authedProcedure.input(ZInviteOrgMemberInputSchema).mutation(async ({ ctx, input }) => {
    const { inviteOrganizationMemberHandler } = await import("./members.handler");
    return inviteOrganizationMemberHandler({ ctx, input });
  }),

  getMembers: authedProcedure.input(ZGetOrgMembersInputSchema).query(async ({ ctx, input }) => {
    const { getOrganizationMembersHandler } = await import("./members.handler");
    return getOrganizationMembersHandler({ ctx, input });
  }),

  updateMemberListing: authedProcedure
    .input(ZUpdateOrgMemberListingInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { updateOrganizationMemberListingHandler } = await import("./members.handler");
      return updateOrganizationMemberListingHandler({ ctx, input });
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
