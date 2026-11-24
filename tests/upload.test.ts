import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { MAX_UPLOAD_BYTES, parseUpload } from "@/lib/upload";

/** Flatten a doc to "type:text" lines for readable assertions. */
function outline(doc: JSONContent): string[] {
  return (doc.content ?? []).map((n) => {
    const text = (function collect(x: JSONContent): string {
      if (x.type === "text") return x.text ?? "";
      if (x.type === "hardBreak") return "\n";
      return (x.content ?? []).map(collect).join(x.type === "bulletList" || x.type === "orderedList" ? "|" : "");
    })(n);
    const tag = n.type === "heading" ? `h${n.attrs?.level}` : n.type;
    return `${tag}:${text}`;
  });
}

function marksOf(doc: JSONContent, word: string): string[] {
  let found: string[] = [];
  (function walk(n: JSONContent) {
    if (n.type === "text" && n.text?.includes(word)) found = (n.marks ?? []).map((m) => m.type).sort();
    n.content?.forEach(walk);
  })(doc);
  return found;
}

async function makeDocx(bodyXml: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );
  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style></w:styles>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

const para = (runs: string, style?: string) =>
  `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}${runs}</w:p>`;
const run = (text: string, props = "") => `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${text}</w:t></w:r>`;

describe("parseUpload: .txt", () => {
  it("turns blank-line-separated blocks into paragraphs and single newlines into breaks", async () => {
    const { title, content } = await parseUpload("meeting notes.txt", Buffer.from("\uFEFFFirst para\nline two\n\n\nSecond para\r\n"));
    expect(title).toBe("meeting notes");
    expect(outline(content)).toEqual(["paragraph:First para\nline two", "paragraph:Second para"]);
  });

  it("rejects binary content disguised as .txt", async () => {
    await expect(parseUpload("x.txt", Buffer.from([0x50, 0x4b, 0x00, 0x01]))).rejects.toMatchObject({ status: 422 });
  });
});

describe("parseUpload: .md", () => {
  it("maps headings, inline marks and lists to editor nodes", async () => {
    const md = "# Title\n\n## Section\n\nSome **bold**, _italic_ and <u>under</u>.\n\n- one\n- two\n\n1. first\n2. second\n";
    const { title, content } = await parseUpload("Plan.md", Buffer.from(md));
    expect(title).toBe("Plan");
    expect(outline(content)).toEqual([
      "h1:Title",
      "h2:Section",
      "paragraph:Some bold, italic and under.",
      "bulletList:one|two",
      "orderedList:first|second",
    ]);
    expect(marksOf(content, "bold")).toEqual(["bold"]);
    expect(marksOf(content, "italic")).toEqual(["italic"]);
    expect(marksOf(content, "under")).toEqual(["underline"]);
  });

  it("degrades unsupported markdown (tables, deep headings) to text and drops scripts", async () => {
    const md = "#### Deep\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n<script>alert('x')</script>\n\nafter";
    const { content } = await parseUpload("t.markdown", Buffer.from(md));
    const lines = outline(content);
    expect(lines[0]).toBe("paragraph:Deep");
    expect(lines.join(" ")).toContain("a b 1 2");
    expect(JSON.stringify(content)).not.toContain("alert");
    expect(lines.at(-1)).toBe("paragraph:after");
  });
});

describe("parseUpload: .docx", () => {
  it("converts headings and bold/italic/underline runs", async () => {
    const buf = await makeDocx(
      para(run("Quarterly Report"), "Heading1") +
        para(run("Summary"), "Heading2") +
        para(run("Revenue was ") + run("strong", "<w:b/>") + run(" and ") + run("steady", "<w:i/>") + run(" and ") + run("noted", '<w:u w:val="single"/>')),
    );
    const { title, content } = await parseUpload("Report.DOCX", buf);
    expect(title).toBe("Report");
    expect(outline(content)).toEqual(["h1:Quarterly Report", "h2:Summary", "paragraph:Revenue was strong and steady and noted"]);
    expect(marksOf(content, "strong")).toEqual(["bold"]);
    expect(marksOf(content, "steady")).toEqual(["italic"]);
  });

  it("rejects a corrupted .docx with a friendly error", async () => {
    await expect(parseUpload("broken.docx", Buffer.from("not a zip file"))).rejects.toMatchObject({ status: 422 });
  });
});

describe("parseUpload: validation", () => {
  it("rejects unsupported extensions with 415", async () => {
    await expect(parseUpload("image.png", Buffer.from("x"))).rejects.toMatchObject({ status: 415 });
    await expect(parseUpload("README", Buffer.from("x"))).rejects.toMatchObject({ status: 415 });
    await expect(parseUpload("old.doc", Buffer.from("x"))).rejects.toMatchObject({ status: 415 });
  });

  it("rejects empty and oversized files", async () => {
    await expect(parseUpload("empty.txt", Buffer.alloc(0))).rejects.toMatchObject({ status: 400 });
    await expect(parseUpload("big.txt", Buffer.alloc(MAX_UPLOAD_BYTES + 1, 97))).rejects.toMatchObject({ status: 413 });
  });

  it("falls back to 'Untitled document' when the filename has no usable title", async () => {
    const { title } = await parseUpload(".md", Buffer.from("hi"));
    expect(title).toBe("Untitled document");
  });
});
