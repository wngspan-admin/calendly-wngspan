import { z } from "zod";

export const ZUpdateOrganizationProfileSlugSchema = z.object({
  organizationId: z.number().int().positive(),
  username: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
});

export const ZCompleteOrganizationOnboardingSchema = z.object({
  organizationId: z.number().int().positive(),
});

export type TUpdateOrganizationProfileSlugSchema = z.infer<typeof ZUpdateOrganizationProfileSlugSchema>;
export type TCompleteOrganizationOnboardingSchema = z.infer<typeof ZCompleteOrganizationOnboardingSchema>;
