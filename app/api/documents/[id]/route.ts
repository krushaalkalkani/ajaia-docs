import { NextResponse } from "next/server";
import { loadDocumentForUser } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { serializeDocument } from "@/lib/documents";
import { HttpError, readJson, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateDocumentSchema } from "@/lib/validation";

type Ctx = { params: { id: string } };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { doc, role } = await loadDocumentForUser(params.id, user.id, "read");
  return NextResponse.json({ document: serializeDocument(doc, role) });
});

/** Autosave + rename. Owner or editor. Optimistic concurrency via baseUpdatedAt. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const input = updateDocumentSchema.parse(await readJson(req));
  const { role } = await loadDocumentForUser(params.id, user.id, "edit");

  const data = {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.content !== undefined && { content: input.content }),
  };

  if (input.baseUpdatedAt) {
    const { count } = await prisma.document.updateMany({
      where: { id: params.id, updatedAt: new Date(input.baseUpdatedAt) },
      data,
    });
    if (count === 0) {
      throw new HttpError(409, "Someone else changed this document since you loaded it.", "conflict");
    }
  } else {
    await prisma.document.update({ where: { id: params.id }, data });
  }

  const updated = await prisma.document.findUniqueOrThrow({
    where: { id: params.id },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ document: serializeDocument(updated, role) });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  await loadDocumentForUser(params.id, user.id, "owner");
  await prisma.document.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
