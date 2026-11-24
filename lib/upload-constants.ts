// Shared by the upload route (server) and the upload button (client).
// Kept dependency-free so importing it never pulls parsers into the browser bundle.
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".markdown", ".docx"] as const;
export const UPLOAD_ACCEPT = SUPPORTED_EXTENSIONS.join(",");
export const SUPPORTED_TYPES_LABEL = ".txt, .md, .docx (max 2 MB)";
