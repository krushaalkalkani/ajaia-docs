import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listDocumentsForUser, serializeDocument } from "@/lib/documents";
import { readJson, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TITLE, createDocumentSchema, emptyDoc } from "@/lib/validation";

/** Dashboard listing: { owned, shared }. */
export const GET = route(async () => {
  const user = await requireUser();
  return NextResponse.json(await listDocumentsForUser(user.id));
});

/** Create a blank (or pre-filled) document owned by the caller. */
export const POST = route(async (req) => {
  const user = await requireUser();
  const raw = req.headers.get("content-length") === "0" ? {} : await readJson(req).catch(() => ({}));
  const input = createDocumentSchema.parse(raw ?? {});
  const doc = await prisma.document.create({
    data: {
      title: input.title ?? DEFAULT_TITLE,
      content: input.content ?? emptyDoc(),
      ownerId: user.id,
    },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ document: serializeDocument(doc, "owner") }, { status: 201 });
});

// Per-user data: never pre-render or cache.
export const dynamic = "force-dynamic";
