import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { signSession, verifySession } from "@/lib/auth";

describe("session cookie signing", () => {
  it("round-trips a signed user id", () => {
    expect(verifySession(signSession("user_123"))).toBe("user_123");
  });

  it("rejects tampered, unsigned or empty tokens", () => {
    const token = signSession("alice");
    const [, sig] = token.split(".");
    expect(verifySession(`bob.${sig}`)).toBeNull();
    expect(verifySession("alice")).toBeNull();
    expect(verifySession(`${token}x`)).toBeNull();
    expect(verifySession("")).toBeNull();
    expect(verifySession(undefined)).toBeNull();
  });
});
