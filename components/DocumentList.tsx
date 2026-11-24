"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { DocumentListItem } from "@/lib/documents";
import { api, errorMessage, relativeTime } from "@/lib/client";

function DocIcon({ shared }: { shared?: boolean }) {
  return (
    <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${shared ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
        <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

const ROLE_STYLE: Record<string, string> = {
  editor: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  viewer: "bg-gray-100 text-gray-700 ring-gray-200",
};

export function DocumentList({ items, kind }: { items: DocumentListItem[]; kind: "owned" | "shared" }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  // Relative times are computed after mount so server and client HTML match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function remove(doc: DocumentListItem) {
    if (!confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    setDeleting(doc.id);
    try {
      await api(`/api/documents/${doc.id}`, { method: "DELETE" });
      toast.success("Document deleted");
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)] bg-white">
      {items.map((doc) => (
        <li key={doc.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-50/70">
          <DocIcon shared={kind === "shared"} />
          <Link href={`/docs/${doc.id}`} className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium group-hover:text-[var(--accent)]">{doc.title}</span>
              {kind === "shared" && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${ROLE_STYLE[doc.role]}`}>
                  Shared · {doc.role === "editor" ? "Can edit" : "View only"}
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-xs text-[var(--muted)]">
              {kind === "shared" ? <>Owner: {doc.owner.name} · </> : null}
              Edited {mounted ? relativeTime(doc.updatedAt) : "…"}
              {kind === "owned" && doc.shareCount ? <> · Shared with {doc.shareCount} {doc.shareCount === 1 ? "person" : "people"}</> : null}
            </div>
          </Link>
          {kind === "owned" && (
            <button
              onClick={() => remove(doc)}
              disabled={deleting === doc.id}
              className="rounded-md px-2 py-1 text-xs text-[var(--muted)] opacity-0 transition hover:bg-red-50 hover:text-red-700 focus:opacity-100 group-hover:opacity-100"
              aria-label={`Delete ${doc.title}`}
            >
              {deleting === doc.id ? "Deleting…" : "Delete"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
