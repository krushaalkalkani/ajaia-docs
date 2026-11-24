import type { Prisma } from "@prisma/client";
import { z } from "zod";

export const DEFAULT_TITLE = "Untitled document";
export const MAX_TITLE_LENGTH = 200;
/** Serialized Tiptap JSON cap. Generous for text docs; stops runaway payloads. */
export const MAX_CONTENT_BYTES = 1_000_000;

/** Trims; empty/whitespace-only titles fall back to "Untitled document". */
export function normalizeTitle(raw: string | null | undefined): string {
  const t = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH);
  return t.length ? t : DEFAULT_TITLE;
}

export const titleSchema = z
  .string({ invalid_type_error: "Title must be text." })
  .max(1000, "Title is too long.")
  .transform(normalizeTitle);

type JsonNode = { type: string; content?: JsonNode[] };

const nodeSchema: z.ZodType<JsonNode> = z.lazy(() =>
  z
    .object({
      type: z.string().min(1),
      content: z.array(nodeSchema).optional(),
    })
    .passthrough(),
);

/** Tiptap document JSON: { type: "doc", content: [...] } with a size cap. */
export const tiptapDocSchema = z
  .object({
    type: z.literal("doc", { errorMap: () => ({ message: 'Content must be a Tiptap document ({ type: "doc" }).' }) }),
    content: z.array(nodeSchema).optional(),
  })
  .passthrough()
  .refine((doc) => JSON.stringify(doc).length <= MAX_CONTENT_BYTES, {
    message: "Document is too large to save (limit is about 1 MB).",
  })
  // Validated JSON is safe to hand straight to Prisma's Json column.
  .transform((doc) => doc as Prisma.InputJsonObject);

export const emptyDoc = (): Prisma.InputJsonObject => ({ type: "doc", content: [{ type: "paragraph" }] });

export const createDocumentSchema = z.object({
  title: titleSchema.optional(),
  content: tiptapDocSchema.optional(),
});

export const updateDocumentSchema = z
  .object({
    title: titleSchema.optional(),
    content: tiptapDocSchema.optional(),
    /**
     * Optimistic concurrency: the `updatedAt` the client last saw. If the doc
     * changed since (another user/tab saved), the server answers 409 instead of
     * silently overwriting. Omit to force-overwrite.
     */
    baseUpdatedAt: z.string().datetime({ message: "baseUpdatedAt must be an ISO timestamp." }).optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    message: "Nothing to update: send a title and/or content.",
  });

export const emailSchema = z
  .string({ required_error: "Email is required." })
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const shareSchema = z.object({
  email: emailSchema,
  role: z.enum(["editor", "viewer"], { errorMap: () => ({ message: 'Role must be "editor" or "viewer".' }) }),
});

export const loginSchema = z.object({ email: emailSchema });

export const idSchema = z.string().min(1).max(64);
