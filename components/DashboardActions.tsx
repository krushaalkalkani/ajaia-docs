"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/client";
import { MAX_UPLOAD_BYTES, SUPPORTED_EXTENSIONS, SUPPORTED_TYPES_LABEL, UPLOAD_ACCEPT } from "@/lib/upload-constants";

type Created = { document: { id: string; title: string } };

export function DashboardActions() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"new" | "upload" | null>(null);

  async function createDoc() {
    setBusy("new");
    try {
      const { document } = await api<Created>("/api/documents", { method: "POST", json: {} });
      router.push(`/docs/${document.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(null);
    }
  }

  async function upload(file: File) {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
      toast.error(`Unsupported file type. Supported: ${SUPPORTED_TYPES_LABEL}.`);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("File is too large. The limit is 2 MB.");
      return;
    }
    setBusy("upload");
    const id = toast.loading(`Importing ${file.name}…`);
    try {
      const body = new FormData();
      body.append("file", file);
      const { document } = await api<Created>("/api/upload", { method: "POST", body });
      toast.success(`Imported "${document.title}"`, { id });
      router.push(`/docs/${document.id}`);
    } catch (e) {
      toast.error(errorMessage(e), { id });
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInput}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload(f);
        }}
      />
      <button
        onClick={() => fileInput.current?.click()}
        disabled={busy !== null}
        title={`Import a file as a new document — ${SUPPORTED_TYPES_LABEL}`}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 16V4M7 9l5-5 5 5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {busy === "upload" ? "Importing…" : "Upload file"}
      </button>
      <button
        onClick={createDoc}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        {busy === "new" ? "Creating…" : "New document"}
      </button>
    </div>
  );
}
