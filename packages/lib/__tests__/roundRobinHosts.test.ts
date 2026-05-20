import { describe, expect, it } from "vitest";

import { selectRoundRobinHost } from "../teams/roundRobinHosts";
import type { RoundRobinHostCandidate } from "../teams/roundRobinHosts";

function makeCandidates(bookingCounts: number[]): RoundRobinHostCandidate[] {
  return bookingCounts.map((bookingCount, i) => ({ userId: i + 1, bookingCount }));
}

describe("selectRoundRobinHost", () => {
  it("returns the host with fewest bookings", () => {
    const candidates = makeCandidates([5, 2, 8]);
    expect(selectRoundRobinHost(candidates)).toBe(2); // userId 2 has 2 bookings
  });

  it("uses userId as tiebreaker when booking counts are equal", () => {
    const candidates = makeCandidates([3, 3, 3]);
    expect(selectRoundRobinHost(candidates)).toBe(1); // lowest userId wins
  });

  it("handles a single candidate", () => {
    const candidates = makeCandidates([0]);
    expect(selectRoundRobinHost(candidates)).toBe(1);
  });

  it("handles a candidate with zero bookings alongside others", () => {
    const candidates = makeCandidates([4, 0, 7]);
    expect(selectRoundRobinHost(candidates)).toBe(2); // userId 2 has 0 bookings
  });

  it("does not mutate the input array", () => {
    const candidates = makeCandidates([3, 1, 2]);
    const copy = candidates.map((c) => ({ ...c }));
    selectRoundRobinHost(candidates);
    expect(candidates).toEqual(copy);
  });

  it("throws when candidates array is empty", () => {
    expect(() => selectRoundRobinHost([])).toThrow(/No hosts/);
  });

  it("higher userId loses tiebreaker", () => {
    const candidates: RoundRobinHostCandidate[] = [
      { userId: 10, bookingCount: 1 },
      { userId: 3, bookingCount: 1 },
      { userId: 7, bookingCount: 2 },
    ];
    expect(selectRoundRobinHost(candidates)).toBe(3); // userId 3 wins tiebreaker
  });
});
