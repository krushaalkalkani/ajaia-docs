import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";

/**
 * The document schema, shared by the browser editor and the server-side
 * import pipeline so uploaded files produce exactly the nodes the editor
 * understands. StarterKit brings paragraphs, headings, bullet/ordered lists,
 * bold, italic, strike, code, blockquote, code block, hr and hard breaks.
 */
export const documentExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Underline,
];
