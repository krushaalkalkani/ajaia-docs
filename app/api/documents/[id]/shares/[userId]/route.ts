import { NextResponse } from "next/server";
import { loadDocumentForUser } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { notFound, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Ctx = { params: { id: string; userId: string } };

/** Owner-only: revoke a user's access. */
export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  await loadDocumentForUser(params.id, user.id, "owner");
  const { count } = await prisma.documentShare.deleteMany({
    where: { documentId: params.id, userId: params.userId },
  });
  if (count === 0) throw notFound("That user doesn't have access to this document.");
  return NextResponse.json({ ok: true });
});
