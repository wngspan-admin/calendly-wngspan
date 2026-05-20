import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCreateOrgInputSchema } from "./create.schema";

export const organizationsRouter = router({
  create: authedProcedure.input(ZCreateOrgInputSchema).mutation(async ({ ctx, input }) => {
    const { createOrganizationHandler } = await import("./create.handler");
    return createOrganizationHandler({ ctx, input });
  }),

  list: authedProcedure.query(async ({ ctx }) => {
    const { listOrganizationsHandler } = await import("./list.handler");
    return listOrganizationsHandler({ ctx });
  }),
});
