import { z } from "zod";

export const ZGetTeamEventTypesInputSchema = z.object({
  teamId: z.number(),
});

export type TGetTeamEventTypesInputSchema = z.infer<typeof ZGetTeamEventTypesInputSchema>;
