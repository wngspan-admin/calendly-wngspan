import { z } from "zod";

// biome-ignore lint/nursery/useExplicitType: zod schema inference is intentional here.
export const ZAdminDeleteOrganizationSchema = z.object({
  organizationId: z.number(),
});

export type TAdminDeleteOrganizationSchema = z.infer<typeof ZAdminDeleteOrganizationSchema>;
