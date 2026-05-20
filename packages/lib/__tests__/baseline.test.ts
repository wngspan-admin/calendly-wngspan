import { describe, expect, it } from "vitest";

describe("Baseline Sanity", () => {
  it("environment is test", () => {
    expect(process.env.NODE_ENV).toBe("test");
  });

  it("DATABASE_URL is set", () => {
    expect(process.env.DATABASE_URL).toBeDefined();
  });
});
