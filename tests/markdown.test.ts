import { describe, expect, it } from "vitest";
import { tiptapToMarkdown } from "@/lib/markdown";

const t = (text: string, ...marks: string[]) => ({ type: "text", text, ...(marks.length && { marks: marks.map((type) => ({ type })) }) });
const p = (...content: object[]) => ({ type: "paragraph", content });

describe("tiptapToMarkdown", () => {
  it("serializes headings, marks and lists", () => {
    const md = tiptapToMarkdown({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [t("Goals")] },
        p(t("Mix of "), t("bold", "bold"), t(", "), t("it", "italic"), t(" and "), t("u", "underline"), t(".")),
        { type: "bulletList", content: [{ type: "listItem", content: [p(t("a"))] }, { type: "listItem", content: [p(t("b"))] }] },
        { type: "orderedList", attrs: { start: 3 }, content: [{ type: "listItem", content: [p(t("c"))] }] },
      ],
    });
    expect(md).toBe("## Goals\n\nMix of **bold**, _it_ and <u>u</u>.\n\n- a\n- b\n\n3. c\n");
  });

  it("indents nested lists and escapes markdown characters in text", () => {
    const md = tiptapToMarkdown({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [p(t("parent")), { type: "bulletList", content: [{ type: "listItem", content: [p(t("child"))] }] }],
            },
          ],
        },
        p(t("5 * 3 = _15_ #hash")),
      ],
    });
    expect(md).toBe("- parent\n  - child\n\n5 \\* 3 = \\_15\\_ \\#hash\n");
  });

  it("handles empty documents", () => {
    expect(tiptapToMarkdown({ type: "doc", content: [{ type: "paragraph" }] })).toBe("\n");
  });
});
