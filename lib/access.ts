/**
 * Centralized access control. Every route and page that touches a document
 * goes through `getRole` (pure) or `loadDocumentForUser` (DB + assert).
 *
 * Roles:
 *   owner  — created the doc. Read, edit, rename, share, delete.
 *   editor — shared with role "editor". Read, edit, rename.
 *   viewer — shared with role "viewer". Read only.
 *   null   — no relationship. Treated as "not found" so we don't leak which
 *            document ids exist.
 */
import { prisma } from "./prisma";
import { forbidden, notFound } from "./http";

export type ShareRole = "editor" | "viewer";
export type AccessRole = "owner" | ShareRole;
export type AccessLevel = "read" | "edit" | "owner";

export interface DocumentAccessInfo {
  ownerId: string;
  shares: { userId: string; role: ShareRole }[];
}

export function getRole(doc: DocumentAccessInfo, userId: string | null | undefined): AccessRole | null {
  if (!userId) return null;
  if (doc.ownerId === userId) return "owner";
  const share = doc.shares.find((s) => s.userId === userId);
  return share ? share.role : null;
}

export function canRead(doc: DocumentAccessInfo, userId: string | null | undefined): boolean {
  return getRole(doc, userId) !== null;
}

export function canEdit(doc: DocumentAccessInfo, userId: string | null | undefined): boolean {
  const role = getRole(doc, userId);
  return role === "owner" || role === "editor";
}

export function isOwner(doc: DocumentAccessInfo, userId: string | null | undefined): boolean {
  return getRole(doc, userId) === "owner";
}

export function roleSatisfies(role: AccessRole | null, level: AccessLevel): boolean {
  if (!role) return false;
  if (level === "read") return true;
  if (level === "edit") return role === "owner" || role === "editor";
  return role === "owner";
}

/**
 * Throws the right HTTP error when `userId` lacks `level` on `doc`:
 *   no access at all      -> 404 (don't reveal the doc exists)
 *   can read, needs more  -> 403
 * Returns the caller's role on success.
 */
export function assertAccess(
  doc: DocumentAccessInfo | null,
  userId: string,
  level: AccessLevel,
): AccessRole {
  const role = doc ? getRole(doc, userId) : null;
  if (!doc || !role) throw notFound("Document not found, or you don't have access to it.");
  if (!roleSatisfies(role, level)) {
    throw forbidden(
      level === "owner"
        ? "Only the owner can do that."
        : "You have view-only access to this document.",
    );
  }
  return role;
}

/** Load a document plus the caller's role, enforcing `level`. */
export async function loadDocumentForUser(documentId: string, userId: string, level: AccessLevel) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      // Only the caller's own share row is needed to decide access.
      shares: { where: { userId }, select: { userId: true, role: true } },
    },
  });
  const role = assertAccess(doc, userId, level);
  return { doc: doc!, role };
}
