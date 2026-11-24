import { NextResponse } from "next/server";
import { loadDocumentForUser } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { badRequest, notFound, readJson, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { shareSchema } from "@/lib/validation";

type Ctx = { params: { id: string } };

const shareSelect = {
  id: true,
  role: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } },
} as const;

/** Owner-only: who has access. */
export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  await loadDocumentForUser(params.id, user.id, "owner");
  const shares = await prisma.documentShare.findMany({
    where: { documentId: params.id },
    orderBy: { createdAt: "asc" },
    select: shareSelect,
  });
  return NextResponse.json({ shares });
});

/** Owner-only: grant (or change) access by email. Idempotent per (doc, user). */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { email, role } = shareSchema.parse(await readJson(req));
  const { doc } = await loadDocumentForUser(params.id, user.id, "owner");

  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) throw notFound(`No user with email ${email}. Only existing users can be added.`);
  if (target.id === doc.ownerId) throw badRequest("You already own this document.");

  const share = await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: params.id, userId: target.id } },
    update: { role },
    create: { documentId: params.id, userId: target.id, role },
    select: shareSelect,
  });
  return NextResponse.json({ share }, { status: 201 });
});
