import { z } from "zod";

export const ZUpdateOrgInputSchema = z.object({
  organizationId: z.number(),
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  bio: z.string().max(500).optional(),
  orgAutoAcceptEmail: z.string().optional(),
});

export type TUpdateOrgInputSchema = z.infer<typeof ZUpdateOrgInputSchema>;
