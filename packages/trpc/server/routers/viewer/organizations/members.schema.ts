import { MembershipRole } from "@calcom/prisma/enums";
import { z } from "zod";

// biome-ignore lint/nursery/useExplicitType: zod schema inference is intentional here.
export const ZGetOrgMembersInputSchema = z.object({
  organizationId: z.number(),
});

// biome-ignore lint/nursery/useExplicitType: zod schema inference is intentional here.
export const ZInviteOrgMemberInputSchema = z.object({
  organizationId: z.number(),
  email: z.string().trim().email(),
  role: z.nativeEnum(MembershipRole).default(MembershipRole.MEMBER),
});

// biome-ignore lint/nursery/useExplicitType: zod schema inference is intentional here.
export const ZRemoveOrgMemberInputSchema = z.object({
  organizationId: z.number(),
  memberId: z.number(),
});

// biome-ignore lint/nursery/useExplicitType: zod schema inference is intentional here.
export const ZChangeOrgMemberRoleInputSchema = z.object({
  organizationId: z.number(),
  memberId: z.number(),
  role: z.nativeEnum(MembershipRole),
});

// biome-ignore lint/nursery/useExplicitType: zod schema inference is intentional here.
export const ZBulkRemoveOrgMembersInputSchema = z.object({
  organizationId: z.number(),
  memberIds: z.array(z.number()).min(1),
});

// biome-ignore lint/nursery/useExplicitType: zod schema inference is intentional here.
export const ZBulkChangeOrgMemberRoleInputSchema = z.object({
  organizationId: z.number(),
  memberIds: z.array(z.number()).min(1),
  role: z.nativeEnum(MembershipRole),
});

export type TGetOrgMembersInputSchema = z.infer<typeof ZGetOrgMembersInputSchema>;
export type TInviteOrgMemberInputSchema = z.infer<typeof ZInviteOrgMemberInputSchema>;
export type TRemoveOrgMemberInputSchema = z.infer<typeof ZRemoveOrgMemberInputSchema>;
export type TChangeOrgMemberRoleInputSchema = z.infer<typeof ZChangeOrgMemberRoleInputSchema>;
export type TBulkRemoveOrgMembersInputSchema = z.infer<typeof ZBulkRemoveOrgMembersInputSchema>;
export type TBulkChangeOrgMemberRoleInputSchema = z.infer<typeof ZBulkChangeOrgMemberRoleInputSchema>;
