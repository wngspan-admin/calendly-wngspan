import { z } from "zod";

export const ZCreateTeamInputSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  bio: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
  isPrivate: z.boolean().default(false),
});

export type TCreateTeamInputSchema = z.infer<typeof ZCreateTeamInputSchema>;
