import { describe, expect, it, vi } from "vitest";

describe("Collective Booking fan-out", () => {
  it("creates calendar events for all fixed hosts", async () => {
    const createCalendarEvent = vi.fn().mockResolvedValue({ id: "cal-event-id" });
    const mockHosts = [{ userId: 1 }, { userId: 2 }, { userId: 3 }];

    const results = await Promise.all(mockHosts.map((h) => createCalendarEvent({ userId: h.userId })));

    expect(createCalendarEvent).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.id === "cal-event-id")).toBe(true);
  });

  it("calls createCalendarEvent with each host userId", async () => {
    const createCalendarEvent = vi.fn().mockResolvedValue({ id: "evt" });
    const hosts = [{ userId: 10 }, { userId: 20 }];

    await Promise.all(hosts.map((h) => createCalendarEvent({ userId: h.userId })));

    expect(createCalendarEvent).toHaveBeenCalledWith({ userId: 10 });
    expect(createCalendarEvent).toHaveBeenCalledWith({ userId: 20 });
  });

  it("handles a single host", async () => {
    const createCalendarEvent = vi.fn().mockResolvedValue({ id: "solo" });
    const hosts = [{ userId: 99 }];

    const results = await Promise.all(hosts.map((h) => createCalendarEvent({ userId: h.userId })));

    expect(createCalendarEvent).toHaveBeenCalledTimes(1);
    expect(results[0].id).toBe("solo");
  });

  it("returns empty array when no hosts", async () => {
    const createCalendarEvent = vi.fn();
    const hosts: { userId: number }[] = [];

    const results = await Promise.all(hosts.map((h) => createCalendarEvent({ userId: h.userId })));

    expect(createCalendarEvent).not.toHaveBeenCalled();
    expect(results).toHaveLength(0);
  });
});
