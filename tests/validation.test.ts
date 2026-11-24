import { describe, expect, it } from "vitest";
import { normalizeTitle, shareSchema, tiptapDocSchema, updateDocumentSchema } from "@/lib/validation";

describe("normalizeTitle", () => {
  it("trims, collapses whitespace and falls back for empty titles", () => {
    expect(normalizeTitle("  My   doc ")).toBe("My doc");
    expect(normalizeTitle("   ")).toBe("Untitled document");
    expect(normalizeTitle(undefined)).toBe("Untitled document");
    expect(normalizeTitle("x".repeat(500))).toHaveLength(200);
  });
});

describe("tiptapDocSchema", () => {
  it("accepts Tiptap documents and rejects other shapes", () => {
    expect(tiptapDocSchema.safeParse({ type: "doc", content: [{ type: "paragraph" }] }).success).toBe(true);
    expect(tiptapDocSchema.safeParse({ type: "paragraph" }).success).toBe(false);
    expect(tiptapDocSchema.safeParse({ type: "doc", content: [{ text: "no type" }] }).success).toBe(false);
    expect(tiptapDocSchema.safeParse("<p>html</p>").success).toBe(false);
  });

  it("rejects documents over the size cap", () => {
    const huge = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(1_100_000) }] }] };
    expect(tiptapDocSchema.safeParse(huge).success).toBe(false);
  });
});

describe("request schemas", () => {
  it("normalizes share emails and validates roles", () => {
    expect(shareSchema.parse({ email: "  Bob@Ajaia.TEST ", role: "viewer" })).toEqual({ email: "bob@ajaia.test", role: "viewer" });
    expect(shareSchema.safeParse({ email: "bob@ajaia.test", role: "owner" }).success).toBe(false);
    expect(shareSchema.safeParse({ email: "not-an-email", role: "editor" }).success).toBe(false);
  });

  it("requires something to update and a valid baseUpdatedAt", () => {
    expect(updateDocumentSchema.safeParse({}).success).toBe(false);
    expect(updateDocumentSchema.parse({ title: "  " }).title).toBe("Untitled document");
    expect(updateDocumentSchema.safeParse({ title: "x", baseUpdatedAt: "yesterday" }).success).toBe(false);
  });
});
