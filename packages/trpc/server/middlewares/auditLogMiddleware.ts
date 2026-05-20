import type { Prisma } from "@calcom/prisma/client";
import prisma from "@calcom/prisma";
import { isAuthed } from "./sessionMiddleware";

/**
 * Creates a tRPC middleware that writes a row to AdminAuditLog after a successful mutation.
 * Built on top of isAuthed so ctx.user is guaranteed. Fire-and-forget.
 */
export function createAuditMiddleware(resource: string, action: string) {
  return isAuthed.unstable_pipe(async ({ ctx, input, next }) => {
    const result = await next();

    if (result.ok) {
      const teamId = (input as Record<string, unknown>)?.teamId;

      void prisma.adminAuditLog
        .create({
          data: {
            userId: ctx.user.id,
            teamId: typeof teamId === "number" ? teamId : null,
            resource,
            action,
            data: input as Prisma.InputJsonValue,
          },
        })
        .catch(() => {
          // intentionally silent — audit log failure must never break the request
        });
    }

    return result;
  });
}
