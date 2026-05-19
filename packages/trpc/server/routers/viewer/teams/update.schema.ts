import { z } from "zod";

export const ZUpdateTeamInputSchema = z.object({
  teamId: z.number(),
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  bio: z.string().max(500).optional(),
  logoUrl: z.string().url().optional().nullable(),
  isPrivate: z.boolean().optional(),
  hideBranding: z.boolean().optional(),
});

export type TUpdateTeamInputSchema = z.infer<typeof ZUpdateTeamInputSchema>;
