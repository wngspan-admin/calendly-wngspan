import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => ({
  default: {
    team: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from "@calcom/prisma";
import listTeamsHandler from "./listTeams.handler";

describe("listTeamsHandler", () => {
  it("queries only non-organization teams", async () => {
    (prisma.team.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listTeamsHandler();

    expect(prisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isOrganization: false },
      })
    );
  });

  it("returns teams list", async () => {
    const mockTeams = [
      {
        id: 1,
        name: "Dev Team",
        slug: "dev-team",
        createdAt: new Date("2026-01-01"),
        _count: { members: 3 },
      },
      {
        id: 2,
        name: "Sales Team",
        slug: "sales-team",
        createdAt: new Date("2026-02-01"),
        _count: { members: 5 },
      },
    ];
    (prisma.team.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockTeams);

    const result = await listTeamsHandler();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Dev Team");
    expect(result[1].name).toBe("Sales Team");
  });

  it("orders by createdAt descending", async () => {
    (prisma.team.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listTeamsHandler();

    expect(prisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    );
  });
});
