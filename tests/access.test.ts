import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { document: { findUnique: (...a: unknown[]) => findUnique(...a) } } }));

import {
  type DocumentAccessInfo,
  assertAccess,
  canEdit,
  canRead,
  getRole,
  isOwner,
  loadDocumentForUser,
} from "@/lib/access";
import { HttpError } from "@/lib/http";

const doc: DocumentAccessInfo = {
  ownerId: "alice",
  shares: [
    { userId: "bob", role: "editor" },
    { userId: "carol", role: "viewer" },
  ],
};

function statusOf(fn: () => unknown): number | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof HttpError ? e.status : -1;
  }
}

describe("getRole", () => {
  it("identifies owner, editor, viewer and strangers", () => {
    expect(getRole(doc, "alice")).toBe("owner");
    expect(getRole(doc, "bob")).toBe("editor");
    expect(getRole(doc, "carol")).toBe("viewer");
    expect(getRole(doc, "mallory")).toBeNull();
  });

  it("treats a missing user as no access", () => {
    expect(getRole(doc, null)).toBeNull();
    expect(getRole(doc, undefined)).toBeNull();
    expect(getRole(doc, "")).toBeNull();
  });

  it("owner wins even if a stray share row exists for them", () => {
    expect(getRole({ ownerId: "alice", shares: [{ userId: "alice", role: "viewer" }] }, "alice")).toBe("owner");
  });
});

describe("canRead / canEdit / isOwner matrix", () => {
  const cases = [
    { user: "alice", read: true, edit: true, owner: true },
    { user: "bob", read: true, edit: true, owner: false },
    { user: "carol", read: true, edit: false, owner: false },
    { user: "mallory", read: false, edit: false, owner: false },
  ];
  it.each(cases)("$user -> read:$read edit:$edit owner:$owner", ({ user, read, edit, owner }) => {
    expect(canRead(doc, user)).toBe(read);
    expect(canEdit(doc, user)).toBe(edit);
    expect(isOwner(doc, user)).toBe(owner);
  });
});

describe("assertAccess", () => {
  it("returns the role when access is sufficient", () => {
    expect(assertAccess(doc, "alice", "owner")).toBe("owner");
    expect(assertAccess(doc, "bob", "edit")).toBe("editor");
    expect(assertAccess(doc, "carol", "read")).toBe("viewer");
  });

  it("404s for users with no access (does not leak existence)", () => {
    expect(statusOf(() => assertAccess(doc, "mallory", "read"))).toBe(404);
    expect(statusOf(() => assertAccess(doc, "mallory", "edit"))).toBe(404);
    expect(statusOf(() => assertAccess(null, "alice", "read"))).toBe(404);
  });

  it("403s when the user can see the doc but lacks the level", () => {
    expect(statusOf(() => assertAccess(doc, "carol", "edit"))).toBe(403);
    expect(statusOf(() => assertAccess(doc, "carol", "owner"))).toBe(403);
    expect(statusOf(() => assertAccess(doc, "bob", "owner"))).toBe(403);
  });
});

describe("loadDocumentForUser", () => {
  beforeEach(() => findUnique.mockReset());

  it("only loads the caller's own share row and enforces the level", async () => {
    findUnique.mockResolvedValue({ id: "d1", ownerId: "alice", shares: [{ userId: "carol", role: "viewer" }] });
    await expect(loadDocumentForUser("d1", "carol", "read")).resolves.toMatchObject({ role: "viewer" });
    expect(findUnique.mock.calls[0][0]).toMatchObject({
      where: { id: "d1" },
      include: { shares: { where: { userId: "carol" } } },
    });
    await expect(loadDocumentForUser("d1", "carol", "edit")).rejects.toMatchObject({ status: 403 });
  });

  it("404s when the document doesn't exist", async () => {
    findUnique.mockResolvedValue(null);
    await expect(loadDocumentForUser("missing", "alice", "read")).rejects.toMatchObject({ status: 404 });
  });
});
