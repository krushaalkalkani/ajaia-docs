import type { JSONContent } from "@tiptap/core";
import { loadDocumentForUser } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/http";
import { tiptapToMarkdown } from "@/lib/markdown";

type Ctx = { params: { id: string } };

/** Download the document as Markdown. Anyone who can read it can export it. */
export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { doc } = await loadDocumentForUser(params.id, user.id, "read");
  const markdown = `# ${doc.title}\n\n` + tiptapToMarkdown(doc.content as JSONContent);
  const base = doc.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "document";
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.md"; filename*=UTF-8''${encodeURIComponent(base)}.md`,
    },
  });
});
