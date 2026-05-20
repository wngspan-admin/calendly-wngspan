import { z } from "zod";

export const ZGetOrgInputSchema = z.object({
  organizationId: z.number(),
});

export type TGetOrgInputSchema = z.infer<typeof ZGetOrgInputSchema>;
