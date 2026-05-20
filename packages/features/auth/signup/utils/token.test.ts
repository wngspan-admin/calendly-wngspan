import { HttpError } from "@calcom/lib/http-error";
import { describe, expect, it } from "vitest";
import { throwIfTokenExpired } from "./token";

describe("throwIfTokenExpired", () => {
  it("does not throw when no expires date is provided", () => {
    expect(() => throwIfTokenExpired(undefined)).not.toThrow();
  });

  it("does not throw when token is not yet expired", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    expect(() => throwIfTokenExpired(future)).not.toThrow();
  });

  it("throws HttpError when token has already expired", () => {
    const past = new Date(Date.now() - 1000);
    expect(() => throwIfTokenExpired(past)).toThrow(HttpError);
  });

  it("thrown error has status 401", () => {
    const past = new Date(Date.now() - 1000);
    expect(() => throwIfTokenExpired(past)).toThrow(
      expect.objectContaining({ statusCode: 401 })
    );
  });
});
