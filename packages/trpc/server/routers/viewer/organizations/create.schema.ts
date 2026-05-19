import { z } from "zod";

export const ZCreateOrgInputSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  orgAutoAcceptEmail: z.string().optional(),
  bio: z.string().max(500).optional(),
});

export type TCreateOrgInputSchema = z.infer<typeof ZCreateOrgInputSchema>;
