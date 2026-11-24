import type { JSONContent } from "@tiptap/core";

/**
 * Tiptap JSON -> Markdown (GFM). Covers every node/mark the editor can
 * produce. Underline has no Markdown syntax, so it's emitted as inline <u>
 * HTML, which GitHub and most renderers accept.
 */
export function tiptapToMarkdown(doc: JSONContent): string {
  const out = (doc.content ?? []).map((n) => block(n, "")).filter((s) => s !== null);
  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function block(node: JSONContent, indent: string): string {
  switch (node.type) {
    case "paragraph":
      return indent + inline(node.content).replace(/\n/g, "\n" + indent);
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
      return indent + "#".repeat(level) + " " + inline(node.content);
    }
    case "bulletList":
      return list(node, indent, () => "- ");
    case "orderedList": {
      const start = Number(node.attrs?.start) || 1;
      return list(node, indent, (i) => `${start + i}. `);
    }
    case "blockquote":
      return (node.content ?? [])
        .map((c) => block(c, ""))
        .join("\n\n")
        .split("\n")
        .map((l) => indent + (l ? "> " + l : ">"))
        .join("\n");
    case "codeBlock": {
      const lang = (node.attrs?.language as string) || "";
      const code = (node.content ?? []).map((c) => c.text ?? "").join("");
      return [indent + "```" + lang, ...code.split("\n").map((l) => indent + l), indent + "```"].join("\n");
    }
    case "horizontalRule":
      return indent + "---";
    default:
      return indent + inline(node.content);
  }
}

function list(node: JSONContent, indent: string, marker: (i: number) => string): string {
  return (node.content ?? [])
    .map((item, i) => {
      const m = marker(i);
      const pad = " ".repeat(m.length);
      const children = item.content ?? [];
      const [first, ...rest] = children;
      const head = indent + m + (first ? block(first, "").replace(/\n/g, "\n" + indent + pad) : "");
      const tail = rest.map((c) => block(c, indent + pad));
      return [head, ...tail].join("\n");
    })
    .join("\n");
}

const ESCAPE = /([\\`*_[\]#<>~|])/g;

function inline(nodes: JSONContent[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((n) => {
      if (n.type === "hardBreak") return "  \n";
      if (n.type !== "text") return inline(n.content);
      const marks = new Set((n.marks ?? []).map((m) => m.type));
      let text = marks.has("code") ? "`" + (n.text ?? "") + "`" : (n.text ?? "").replace(ESCAPE, "\\$1");
      if (!text.trim()) return text;
      // Keep surrounding whitespace outside the markers so `** bold**` doesn't break.
      const [, lead, core, trail] = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
      text = core;
      if (marks.has("bold")) text = `**${text}**`;
      if (marks.has("italic")) text = `_${text}_`;
      if (marks.has("strike")) text = `~~${text}~~`;
      if (marks.has("underline")) text = `<u>${text}</u>`;
      return lead + text + trail;
    })
    .join("");
}
