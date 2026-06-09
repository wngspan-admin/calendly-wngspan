import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TUpdateAppCredentialsInputSchema } from "./updateAppCredentials.schema";

export type UpdateAppCredentialsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateAppCredentialsInputSchema;
};

type CustomValidator = (options: { input: TUpdateAppCredentialsInputSchema }) => Promise<unknown> | unknown;

const validatePaypalCredentials: CustomValidator = ({ input }) => {
  const clientId = "client_id" in input.key ? input.key.client_id : undefined;
  const secretKey = "secret_key" in input.key ? input.key.secret_key : undefined;

  if (typeof clientId !== "string" || clientId.trim().length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "PayPal client ID is required",
    });
  }

  if (typeof secretKey !== "string" || secretKey.trim().length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "PayPal secret key is required",
    });
  }

  return {
    client_id: clientId.trim(),
    secret_key: secretKey.trim(),
  };
};

const validators: Record<string, CustomValidator> = {
  paypal: validatePaypalCredentials,
};

export const handleCustomValidations = async ({
  input,
  appId,
}: UpdateAppCredentialsOptions & { appId: string }) => {
  const { key } = input;
  const validatorGetter = validators[appId as keyof typeof validators];
  // If no validator is found, return the key as is
  if (!validatorGetter) return key;
  try {
    return await validatorGetter({ input });
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Validation failed",
    });
  }
};

export const updateAppCredentialsHandler = async ({ ctx, input }: UpdateAppCredentialsOptions) => {
  const { user } = ctx;

  // Find user credential
  const credential = await prisma.credential.findFirst({
    where: {
      id: input.credentialId,
      userId: user.id,
    },
  });
  // Check if credential exists
  if (!credential) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Could not find credential ${input.credentialId}`,
    });
  }

  const validatedKeys = await handleCustomValidations({ ctx, input, appId: credential.appId || "" });

  const updated = await prisma.credential.update({
    where: {
      id: credential.id,
    },
    data: {
      key: {
        ...(credential.key as Prisma.JsonObject),
        ...(validatedKeys as Prisma.JsonObject),
      },
    },
  });

  return !!updated;
};
