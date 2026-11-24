import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { serializeDocument } from "@/lib/documents";
import { HttpError, badRequest, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { MAX_UPLOAD_BYTES, SUPPORTED_TYPES_LABEL, UploadError, parseUpload } from "@/lib/upload";
import { tiptapDocSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** multipart/form-data with a single `file` field -> a NEW editable document. */
export const POST = route(async (req) => {
  const user = await requireUser();

  // Cheap early reject before buffering the body (allow some multipart overhead).
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) throw new HttpError(413, "File is too large. The limit is 2 MB.", "too_large");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest("Expected a multipart/form-data upload with a 'file' field.");
  }
  const file = form.get("file");
  if (!file || typeof file === "string") throw badRequest(`Choose a file to upload (${SUPPORTED_TYPES_LABEL}).`);
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "File is too large. The limit is 2 MB.", "too_large");

  let parsed;
  try {
    parsed = await parseUpload(file.name, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof UploadError) throw new HttpError(e.status, e.message, "upload_error");
    throw e;
  }

  const content = tiptapDocSchema.parse(parsed.content);
  const doc = await prisma.document.create({
    data: { title: parsed.title, content, ownerId: user.id },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ document: serializeDocument(doc, "owner") }, { status: 201 });
});
