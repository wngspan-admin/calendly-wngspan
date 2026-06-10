import { isReservedOrganizationSlug } from "@calcom/lib/publicRoutes";
import { z } from "zod";

export const ZAdminProvisionOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .refine((slug) => !isReservedOrganizationSlug(slug), "This organization slug is reserved"),
  ownerEmail: z.string().email(),
  bio: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  brandColor: z.string().max(20).optional(),
  darkBrandColor: z.string().max(20).optional(),
});

export type TAdminProvisionOrganizationSchema = z.infer<typeof ZAdminProvisionOrganizationSchema>;
