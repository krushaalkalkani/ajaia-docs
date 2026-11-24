"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { api, errorMessage } from "@/lib/client";

type U = { id: string; name: string; email: string };
type Role = "editor" | "viewer";
type Share = { id: string; role: Role; user: U };

export function ShareDialog({
  docId,
  docTitle,
  owner,
  users,
  onClose,
}: {
  docId: string;
  docTitle: string;
  owner: U;
  users: U[];
  onClose: () => void;
}) {
  const [shares, setShares] = useState<Share[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [submitting, setSubmitting] = useState(false);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const load = useCallback(async () => {
    try {
      const data = await api<{ shares: Share[] }>(`/api/documents/${docId}/shares`);
      setShares(data.shares);
    } catch (e) {
      toast.error(errorMessage(e));
      setShares([]);
    }
  }, [docId]);

  useEffect(() => {
    void load();
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!email.trim()) return setFormError("Enter the email of the person to share with.");
    setSubmitting(true);
    try {
      const { share } = await api<{ share: Share }>(`/api/documents/${docId}/shares`, {
        method: "POST",
        json: { email, role },
      });
      const existed = shares?.some((s) => s.user.id === share.user.id);
      setShares((prev) => [...(prev ?? []).filter((s) => s.user.id !== share.user.id), share]);
      setEmail("");
      toast.success(
        existed
          ? `${share.user.name} is now ${role === "editor" ? "an editor" : "a viewer"}`
          : `Shared with ${share.user.name} as ${role === "editor" ? "an editor" : "a viewer"}`,
      );
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function changeRole(s: Share, next: Role) {
    setBusyUser(s.user.id);
    try {
      const { share } = await api<{ share: Share }>(`/api/documents/${docId}/shares`, {
        method: "POST",
        json: { email: s.user.email, role: next },
      });
      setShares((prev) => prev?.map((x) => (x.user.id === share.user.id ? share : x)) ?? null);
      toast.success(`${s.user.name} can now ${next === "editor" ? "edit" : "only view"}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyUser(null);
    }
  }

  async function revoke(s: Share) {
    setBusyUser(s.user.id);
    try {
      await api(`/api/documents/${docId}/shares/${s.user.id}`, { method: "DELETE" });
      setShares((prev) => prev?.filter((x) => x.user.id !== s.user.id) ?? null);
      toast.success(`Removed ${s.user.name}'s access`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyUser(null);
    }
  }

  const sharedIds = new Set(shares?.map((s) => s.user.id));
  const suggestions = users.filter((u) => u.id !== owner.id && !sharedIds.has(u.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-[12vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0">
            <h2 id="share-title" className="text-base font-semibold">
              Share “{docTitle}”
            </h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">Editors can change the document. Viewers can only read it.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[var(--muted)] hover:bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={add} className="px-5 pt-4" noValidate>
          <label htmlFor="share-email" className="mb-1.5 block text-sm font-medium">
            Add people by email
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="share-email"
              type="email"
              list="share-suggestions"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFormError(null);
              }}
              placeholder="e.g. bob@ajaia.test"
              autoComplete="off"
              aria-invalid={!!formError}
              aria-describedby={formError ? "share-error" : undefined}
              className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <datalist id="share-suggestions">
              {suggestions.map((u) => (
                <option key={u.id} value={u.email}>
                  {u.name}
                </option>
              ))}
            </datalist>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              aria-label="Role"
              className="rounded-lg border border-[var(--line)] bg-white px-2 py-2 text-sm"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Sharing…" : "Share"}
            </button>
          </div>
          {formError && (
            <p id="share-error" role="alert" className="mt-2 text-sm text-red-600">
              {formError}
            </p>
          )}
          {suggestions.length > 0 && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Test users:{" "}
              {suggestions.map((u, i) => (
                <span key={u.id}>
                  {i > 0 && ", "}
                  <button type="button" className="underline decoration-dotted hover:text-[var(--ink)]" onClick={() => setEmail(u.email)}>
                    {u.email}
                  </button>
                </span>
              ))}
            </p>
          )}
        </form>

        <div className="px-5 pb-5 pt-4">
          <h3 className="mb-2 text-sm font-medium">People with access</h3>
          <ul className="space-y-1">
            <li className="flex items-center gap-3 rounded-lg px-1 py-1.5">
              <Avatar name={owner.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{owner.name}</div>
                <div className="truncate text-xs text-[var(--muted)]">{owner.email}</div>
              </div>
              <span className="text-sm text-[var(--muted)]">Owner</span>
            </li>
            {shares === null && <li className="px-1 py-2 text-sm text-[var(--muted)]">Loading…</li>}
            {shares?.map((s) => (
              <li key={s.user.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                <Avatar name={s.user.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{s.user.name}</div>
                  <div className="truncate text-xs text-[var(--muted)]">{s.user.email}</div>
                </div>
                <select
                  value={s.role}
                  disabled={busyUser === s.user.id}
                  onChange={(e) => changeRole(s, e.target.value as Role)}
                  aria-label={`Role for ${s.user.name}`}
                  className="rounded-md border border-transparent bg-transparent px-1 py-1 text-sm hover:border-[var(--line)]"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={() => revoke(s)}
                  disabled={busyUser === s.user.id}
                  className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
            {shares?.length === 0 && (
              <li className="px-1 py-1.5 text-sm text-[var(--muted)]">Not shared with anyone yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
