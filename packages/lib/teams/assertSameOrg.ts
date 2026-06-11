import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

/**
 * Asserts that a team-scoped resource belongs to the caller's organization.
 *
 * A team within an org has parentId === org.id. A standalone team has parentId === null.
 * Both callers (in an org) and standalone callers (organizationId === null) are handled.
 *
 * @throws ErrorWithCode(Forbidden) when the resource belongs to a different org.
 */
export function assertSameOrg(
  resource: { parentId: number | null },
  user: { organizationId: number | null }
): void {
  if (resource.parentId !== user.organizationId) {
    throw new ErrorWithCode(ErrorCode.Forbidden, "Resource does not belong to your organization");
  }
}
