import { z } from "zod";

export const ZAcceptOrganizationInviteSchema = z.object({
  organizationId: z.number().int().positive(),
});

export type TAcceptOrganizationInviteSchema = z.infer<typeof ZAcceptOrganizationInviteSchema>;
