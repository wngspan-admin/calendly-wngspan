import dayjs from "@calcom/dayjs";
import { validateAndGetCorrectedUsernameInTeam } from "@calcom/features/auth/signup/utils/validateUsername";
import { HttpError } from "@calcom/lib/http-error";
import { prisma } from "@calcom/prisma";
import type { MembershipRole } from "@calcom/prisma/enums";

type SignupInviteToken = {
  id: number;
  expires: Date;
  teamId: number | null;
  membershipRole: MembershipRole | null;
};

export async function findTokenByToken({ token }: { token: string }): Promise<SignupInviteToken> {
  const foundToken = await prisma.verificationToken.findUnique({
    where: {
      token,
    },
    select: {
      id: true,
      expires: true,
      teamId: true,
      membershipRole: true,
    },
  });

  if (!foundToken) {
    throw new HttpError({
      statusCode: 401,
      message: "Invalid Token",
    });
  }

  return foundToken;
}

export function throwIfTokenExpired(expires?: Date): void {
  if (!expires) return;
  if (dayjs(expires).isBefore(dayjs())) {
    throw new HttpError({
      statusCode: 401,
      message: "Token expired",
    });
  }
}

export async function validateAndGetCorrectedUsernameForTeam({
  username,
  email,
  teamId,
  isSignup,
}: {
  username: string;
  email: string;
  teamId: number | null;
  isSignup: boolean;
}): Promise<string> {
  if (!teamId) return username;

  const teamUserValidation = await validateAndGetCorrectedUsernameInTeam(username, email, teamId, isSignup);
  if (!teamUserValidation.isValid) {
    throw new HttpError({
      statusCode: 409,
      message: "Username or email is already taken",
    });
  }
  if (!teamUserValidation.username) {
    throw new HttpError({
      statusCode: 422,
      message: "Invalid username",
    });
  }
  return teamUserValidation.username;
}
