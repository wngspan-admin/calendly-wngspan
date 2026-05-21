import { z } from "zod";

// biome-ignore lint/nursery/useExplicitType: zod schema inference is intentional here.
export const ZAdminUpdateOrganizationSchema = z.object({
  organizationId: z.number(),
  name: z.string().trim().min(1).optional(),
  orgAutoAcceptEmail: z.string().trim().optional(),
  isOrganizationVerified: z.boolean().optional(),
});

export type TAdminUpdateOrganizationSchema = z.infer<typeof ZAdminUpdateOrganizationSchema>;
