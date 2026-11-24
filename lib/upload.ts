import type { JSONContent } from "@tiptap/core";
import mammoth from "mammoth";
import { marked } from "marked";
import { htmlToTiptapJson } from "./tiptap/html-to-json";
import { normalizeTitle } from "./validation";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".markdown", ".docx"] as const;
/** For <input accept> and user-facing copy. */
export const UPLOAD_ACCEPT = SUPPORTED_EXTENSIONS.join(",");
export const SUPPORTED_TYPES_LABEL = ".txt, .md, .docx (max 2 MB)";

export class UploadError extends Error {
  constructor(
    public status: 400 | 413 | 415 | 422,
    message: string,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export interface ParsedUpload {
  title: string;
  content: JSONContent;
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

function decodeText(buf: Buffer): string {
  if (buf.includes(0)) {
    throw new UploadError(422, "That file doesn't look like plain text. Supported types: " + SUPPORTED_TYPES_LABEL);
  }
  return buf.toString("utf8").replace(/^﻿/, "");
}

/** Plain text: blank lines separate paragraphs; single newlines become line breaks. */
export function textToTiptapJson(text: string): JSONContent {
  const blocks = text.replace(/\r\n?/g, "\n").split(/\n[ \t]*\n/);
  const content: JSONContent[] = blocks
    .map((block) => block.replace(/^\n+|\n+$/g, ""))
    .filter((block) => block.trim().length > 0)
    .map((block) => {
      const lines = block.split("\n");
      const inline: JSONContent[] = [];
      lines.forEach((line, i) => {
        if (i > 0) inline.push({ type: "hardBreak" });
        if (line.length) inline.push({ type: "text", text: line });
      });
      return { type: "paragraph", content: inline };
    });
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

export async function markdownToTiptapJson(markdown: string): Promise<JSONContent> {
  const html = await marked.parse(markdown, { gfm: true, breaks: false });
  return htmlToTiptapJson(html);
}

export async function docxToTiptapJson(buf: Buffer): Promise<JSONContent> {
  let html: string;
  try {
    ({ value: html } = await mammoth.convertToHtml({ buffer: buf }));
  } catch {
    throw new UploadError(422, "We couldn't read that .docx file. It may be corrupted or not a real Word document.");
  }
  return htmlToTiptapJson(html);
}

/** Validate + convert an uploaded file into a title and Tiptap JSON content. */
export async function parseUpload(filename: string, buf: Buffer): Promise<ParsedUpload> {
  const ext = extensionOf(filename);
  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new UploadError(415, `Unsupported file type${ext ? ` "${ext}"` : ""}. Supported types: ${SUPPORTED_TYPES_LABEL}.`);
  }
  if (buf.byteLength === 0) throw new UploadError(400, "That file is empty.");
  if (buf.byteLength > MAX_UPLOAD_BYTES) throw new UploadError(413, "File is too large. The limit is 2 MB.");

  const title = normalizeTitle(filename.slice(0, filename.length - ext.length));
  let content: JSONContent;
  if (ext === ".txt") content = textToTiptapJson(decodeText(buf));
  else if (ext === ".md" || ext === ".markdown") content = await markdownToTiptapJson(decodeText(buf));
  else content = await docxToTiptapJson(buf);

  return { title, content };
}
