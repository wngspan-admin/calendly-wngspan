import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { TRPCError } from "@trpc/server";
import type { TAdminUpdateOrganizationSchema } from "./updateOrganization.schema";

type UpdateOptions = {
  input: TAdminUpdateOrganizationSchema;
};

const updateOrganizationHandler = async ({ input }: UpdateOptions) => {
  const existing = await prisma.team.findUnique({
    where: { id: input.organizationId },
    select: { id: true, isOrganization: true },
  });

  if (!existing || !existing.isOrganization) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
  }

  const data: Prisma.TeamUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.orgAutoAcceptEmail !== undefined || input.isOrganizationVerified !== undefined) {
    data.organizationSettings = {
      upsert: {
        create: {
          orgAutoAcceptEmail: input.orgAutoAcceptEmail ?? "",
          isOrganizationConfigured: true as const,
          isOrganizationVerified: input.isOrganizationVerified ?? false,
        },
        update: {
          ...(input.orgAutoAcceptEmail !== undefined && { orgAutoAcceptEmail: input.orgAutoAcceptEmail }),
          ...(input.isOrganizationVerified !== undefined && {
            isOrganizationVerified: input.isOrganizationVerified,
          }),
        },
      },
    };
  }

  return prisma.team.update({
    where: { id: input.organizationId },
    data,
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      organizationSettings: {
        select: {
          orgAutoAcceptEmail: true,
          isOrganizationVerified: true,
        },
      },
    },
  });
};

export default updateOrganizationHandler;
