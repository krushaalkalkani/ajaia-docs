import type { Document, User } from "@prisma/client";
import { prisma } from "./prisma";
import type { AccessRole } from "./access";

export type PublicUser = Pick<User, "id" | "name" | "email">;

export const publicUser = (u: PublicUser): PublicUser => ({ id: u.id, name: u.name, email: u.email });

export function serializeDocument(doc: Document & { owner: PublicUser }, role: AccessRole) {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    owner: publicUser(doc.owner),
    role,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export type SerializedDocument = ReturnType<typeof serializeDocument>;

export interface DocumentListItem {
  id: string;
  title: string;
  updatedAt: string;
  role: AccessRole;
  owner: PublicUser;
  shareCount?: number;
}

/** Dashboard data: docs I own + docs shared with me, newest first. */
export async function listDocumentsForUser(userId: string) {
  const [owned, shares] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { shares: true } },
      },
    }),
    prisma.documentShare.findMany({
      where: { userId },
      orderBy: { document: { updatedAt: "desc" } },
      select: {
        role: true,
        document: {
          select: {
            id: true,
            title: true,
            updatedAt: true,
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
  ]);

  return {
    owned: owned.map<DocumentListItem>((d) => ({
      id: d.id,
      title: d.title,
      updatedAt: d.updatedAt.toISOString(),
      role: "owner",
      owner: d.owner,
      shareCount: d._count.shares,
    })),
    shared: shares.map<DocumentListItem>((s) => ({
      id: s.document.id,
      title: s.document.title,
      updatedAt: s.document.updatedAt.toISOString(),
      role: s.role,
      owner: s.document.owner,
    })),
  };
}
