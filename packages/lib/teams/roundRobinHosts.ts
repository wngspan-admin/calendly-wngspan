/**
 * Centralized round-robin host selection algorithm for team event types.
 *
 * The strategy is load-based: the host with the fewest accepted/pending bookings
 * in the last 30 days is selected. userId is used as a stable tiebreaker so
 * the same host is not repeatedly chosen when counts are equal.
 */

import prisma from "@calcom/prisma";

export type RoundRobinHostCandidate = {
  userId: number;
  bookingCount: number;
};

/**
 * Pure selection function — decoupled from DB so it can be unit-tested directly.
 * Accepts an array of candidates and returns the userId of the best pick.
 */
export function selectRoundRobinHost(candidates: RoundRobinHostCandidate[]): number {
  if (candidates.length === 0) {
    throw new Error("No hosts configured for this event type");
  }

  const sorted = [...candidates].sort((a, b) => {
    const diff = a.bookingCount - b.bookingCount;
    return diff !== 0 ? diff : a.userId - b.userId;
  });

  return sorted[0].userId;
}

/**
 * DB-backed wrapper: fetches all non-fixed hosts for an event type, counts their
 * recent bookings, and returns the userId of the next host to assign.
 */
export async function getRoundRobinHost(eventTypeId: number): Promise<number> {
  const lookbackMs = 30 * 24 * 60 * 60 * 1000;
  const since = new Date(Date.now() - lookbackMs);

  const hosts = await prisma.host.findMany({
    where: { eventTypeId, isFixed: false },
    select: {
      userId: true,
      user: {
        select: {
          bookings: {
            where: {
              createdAt: { gte: since },
              status: { in: ["ACCEPTED", "PENDING"] },
            },
            select: { id: true },
          },
        },
      },
    },
  });

  const candidates: RoundRobinHostCandidate[] = hosts.map((h) => ({
    userId: h.userId,
    bookingCount: h.user.bookings.length,
  }));

  return selectRoundRobinHost(candidates);
}
