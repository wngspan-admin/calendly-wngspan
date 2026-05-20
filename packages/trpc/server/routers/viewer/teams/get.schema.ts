import { z } from "zod";

export const ZGetTeamInputSchema = z.object({
  teamId: z.number(),
});

export type TGetTeamInputSchema = z.infer<typeof ZGetTeamInputSchema>;
