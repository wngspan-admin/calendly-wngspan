import { z } from "zod";

export const ZInviteMemberInputSchema = z.object({
  teamId: z.number(),
  email: z.string().email(),
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
});

export type TInviteMemberInputSchema = z.infer<typeof ZInviteMemberInputSchema>;
