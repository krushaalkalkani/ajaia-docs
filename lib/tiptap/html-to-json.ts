import { getSchema, type JSONContent } from "@tiptap/core";
import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import { parseHTML } from "linkedom";
import { documentExtensions } from "./extensions";

const schema = getSchema(documentExtensions);
const parser = PMDOMParser.fromSchema(schema);

/**
 * Server-side HTML -> Tiptap JSON. Uses ProseMirror's own DOM parser against
 * the editor schema (with linkedom standing in for the browser DOM), so any
 * HTML — from mammoth (.docx) or marked (.md) — is coerced into a valid
 * document: known tags map to nodes/marks, unknown ones (tables, images,
 * spans...) are flattened to their text instead of breaking the editor.
 */
export function htmlToTiptapJson(html: string): JSONContent {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  // ProseMirror only reads the standard DOM API, which linkedom implements.
  const doc = parser.parse(document.body as unknown as Node);
  const json = doc.toJSON() as JSONContent;
  if (!json.content || json.content.length === 0) json.content = [{ type: "paragraph" }];
  return json;
}
