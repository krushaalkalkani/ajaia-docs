"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { relativeTime } from "@/lib/client";
import type { SerializedDocument } from "@/lib/documents";
import { documentExtensions } from "@/lib/tiptap/extensions";
import { ShareDialog } from "./ShareDialog";
import { Toolbar } from "./Toolbar";
import { type SaveStatus, useDocumentSaver } from "./useDocumentSaver";

type U = { id: string; name: string; email: string };

function SaveIndicator({ status, lastSavedAt }: { status: SaveStatus; lastSavedAt: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const map: Record<SaveStatus, { text: string; cls: string }> = {
    saved: { text: `Saved ${relativeTime(lastSavedAt)}`, cls: "text-[var(--muted)]" },
    unsaved: { text: "Unsaved changes", cls: "text-[var(--muted)]" },
    saving: { text: "Saving…", cls: "text-[var(--muted)]" },
    error: { text: "Not saved", cls: "text-red-600" },
    conflict: { text: "Edit conflict", cls: "text-amber-700" },
    readonly: { text: "View only", cls: "text-[var(--muted)]" },
  };
  const { text, cls } = map[status];
  return (
    <span className={`flex items-center gap-1.5 whitespace-nowrap text-xs ${cls}`} aria-live="polite" data-testid="save-status">
      {status === "saving" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />}
      {status === "saved" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {text}
    </span>
  );
}

export function DocumentEditor({ doc, user, users }: { doc: SerializedDocument; user: U; users: U[] }) {
  const canEdit = doc.role === "owner" || doc.role === "editor";
  const isOwner = doc.role === "owner";
  const saver = useDocumentSaver(doc.id, doc.updatedAt, canEdit);
  const [title, setTitle] = useState(doc.title);
  const [shareOpen, setShareOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const editor = useEditor({
    extensions: [
      ...documentExtensions,
      Placeholder.configure({ placeholder: canEdit ? "Start writing…" : "This document is empty." }),
    ],
    content: doc.content as object,
    editable: canEdit,
    immediatelyRender: false,
    editorProps: { attributes: { "aria-label": "Document body", spellcheck: "true" } },
    onUpdate: ({ editor }) => saver.queue({ content: editor.getJSON() }),
  });

  useEffect(() => {
    document.title = `${title.trim() || "Untitled document"} – Ajaia Docs`;
  }, [title]);

  async function exportMarkdown() {
    setExporting(true);
    try {
      await saver.saveNow();
      window.location.href = `/api/documents/${doc.id}/export`;
    } finally {
      setTimeout(() => setExporting(false), 800);
    }
  }

  const roleLabel = doc.role === "owner" ? null : doc.role === "editor" ? "Can edit" : "View only";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white">
        <div className="flex items-center gap-3 px-4 pb-1 pt-2.5">
          <Link href="/" aria-label="Back to documents" title="Back to documents" className="rounded-md p-1 hover:bg-gray-100">
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="1.5" width="18" height="21" rx="3" fill="#1a56db" />
              <rect x="7" y="7" width="10" height="1.8" rx=".9" fill="#fff" />
              <rect x="7" y="11" width="10" height="1.8" rx=".9" fill="#fff" />
              <rect x="7" y="15" width="6.5" height="1.8" rx=".9" fill="#fff" />
            </svg>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <input
                value={title}
                readOnly={!canEdit}
                onChange={(e) => {
                  setTitle(e.target.value);
                  saver.queue({ title: e.target.value });
                }}
                onBlur={() => !title.trim() && setTitle("Untitled document")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    editor?.commands.focus("start");
                  }
                }}
                aria-label="Document title"
                placeholder="Untitled document"
                maxLength={200}
                className="min-w-0 max-w-[min(520px,100%)] flex-shrink rounded-md border border-transparent px-1.5 py-0.5 text-lg font-medium outline-none hover:border-[var(--line)] focus:border-blue-400 read-only:hover:border-transparent"
                style={{ width: `${Math.max(title.length, 16) + 2}ch` }}
              />
              <SaveIndicator status={saver.status} lastSavedAt={saver.lastSavedAt} />
            </div>
            <div className="truncate px-1.5 text-xs text-[var(--muted)]">
              {isOwner ? "You own this document" : <>Owned by {doc.owner.name}</>}
              {roleLabel && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">Shared with you · {roleLabel}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportMarkdown}
              disabled={exporting}
              title="Download as Markdown (.md)"
              className="hidden rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 sm:inline-flex"
            >
              {exporting ? "Exporting…" : "Export .md"}
            </button>
            {isOwner && (
              <button
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                Share
              </button>
            )}
            <span title={`${user.name} (${user.email})`}>
              <Avatar name={user.name} size={32} />
            </span>
          </div>
        </div>

        <div className="border-t border-transparent px-3 pb-1.5">
          {canEdit ? (
            <Toolbar editor={editor} />
          ) : (
            <div className="flex items-center gap-2 px-1.5 py-1.5 text-sm text-[var(--muted)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              You have view-only access. Ask {doc.owner.name} for edit access.
            </div>
          )}
        </div>
      </header>

      {saver.status === "conflict" && (
        <div role="alert" className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-[816px] flex-wrap items-center gap-3 px-4 py-2.5 text-sm text-amber-900">
            <span className="flex-1">
              Someone else saved changes to this document while you were editing. Your latest edits haven&apos;t been
              saved.
            </span>
            <button onClick={saver.reloadLatest} className="rounded-md border border-amber-300 bg-white px-3 py-1 font-medium hover:bg-amber-100">
              Load their version
            </button>
            <button
              onClick={() => {
                void saver.overwrite();
                toast.success("Saved your version");
              }}
              className="rounded-md bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700"
            >
              Keep mine
            </button>
          </div>
        </div>
      )}

      <main className="px-4 py-8">
        <div
          className="doc-content mx-auto min-h-[calc(100vh-10rem)] max-w-[816px] rounded-sm border border-[var(--line)] bg-white px-8 py-10 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:px-16 sm:py-14"
          onClick={() => canEdit && editor && !editor.isFocused && editor.commands.focus("end")}
        >
          {editor ? <EditorContent editor={editor} /> : <div className="h-40 animate-pulse rounded bg-gray-50" />}
        </div>
      </main>

      {shareOpen && (
        <ShareDialog docId={doc.id} docTitle={title.trim() || "Untitled document"} owner={doc.owner} users={users} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}
