"use client";

import type { JSONContent } from "@tiptap/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict" | "readonly";
type Patch = { title?: string; content?: JSONContent };

export const AUTOSAVE_DEBOUNCE_MS = 800;
const RETRY_MS = 4000;

/**
 * Debounced, serialized autosave for one document.
 *
 * - Edits are merged into a pending patch and sent ~800ms after the last change.
 * - Only one request is in flight at a time; edits made during a save are sent
 *   right after it finishes, so saves never race each other.
 * - Every save carries the `updatedAt` we last saw. If someone else saved in
 *   between, the server answers 409 and we stop autosaving and ask the user
 *   (reload theirs, or overwrite with mine) instead of silently clobbering.
 * - Network/5xx failures keep the patch and retry; leaving the page with
 *   unsaved changes triggers the browser's "leave site?" prompt.
 */
export function useDocumentSaver(docId: string, initialUpdatedAt: string, enabled: boolean) {
  const [status, setStatus] = useState<SaveStatus>(enabled ? "saved" : "readonly");
  const [lastSavedAt, setLastSavedAt] = useState(initialUpdatedAt);
  const pending = useRef<Patch>({});
  const base = useRef(initialUpdatedAt);
  const inFlight = useRef(false);
  const halted = useRef(false);
  const skipUnloadPrompt = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const hasPending = () => Object.keys(pending.current).length > 0;

  const flush = useCallback(
    async (opts: { force?: boolean } = {}): Promise<void> => {
      clearTimeout(timer.current);
      if (!enabled || inFlight.current || !hasPending()) return;
      if (halted.current && !opts.force) return;

      const patch = pending.current;
      pending.current = {};
      inFlight.current = true;
      setStatus("saving");
      let retry = false;

      try {
        const res = await fetch(`/api/documents/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...patch, ...(opts.force ? {} : { baseUpdatedAt: base.current }) }),
        });
        const data = await res.json().catch(() => null);

        if (res.ok) {
          base.current = data.document.updatedAt;
          halted.current = false;
          setLastSavedAt(data.document.updatedAt);
          setStatus(hasPending() ? "unsaved" : "saved");
          toast.dismiss("save-error");
        } else {
          // Put the unsent edits back, underneath anything typed since.
          pending.current = { ...patch, ...pending.current };
          const message: string = data?.error?.message ?? `Save failed (${res.status}).`;
          if (res.status === 409) {
            halted.current = true;
            setStatus("conflict");
          } else if (res.status === 401) {
            skipUnloadPrompt.current = true;
            window.location.href = "/login";
          } else if (res.status === 403 || res.status === 404) {
            halted.current = true;
            setStatus("error");
            toast.error(`Can't save: ${message}`, { id: "save-error", duration: Infinity });
          } else if (res.status >= 500) {
            setStatus("error");
            retry = true;
            toast.error("Couldn't save — retrying…", { id: "save-error" });
          } else {
            // 400/413: this content won't be accepted as-is; wait for the next edit.
            setStatus("error");
            toast.error(message, { id: "save-error" });
          }
        }
      } catch {
        pending.current = { ...patch, ...pending.current };
        setStatus("error");
        retry = true;
        toast.error("You appear to be offline — changes will save when you reconnect.", { id: "save-error" });
      } finally {
        inFlight.current = false;
      }

      if (retry) timer.current = setTimeout(() => void flush(), RETRY_MS);
      else if (hasPending() && !halted.current) timer.current = setTimeout(() => void flush(), AUTOSAVE_DEBOUNCE_MS);
    },
    [docId, enabled],
  );

  const queue = useCallback(
    (patch: Patch) => {
      if (!enabled) return;
      Object.assign(pending.current, patch);
      if (halted.current) return; // keep collecting edits, but wait for the user's decision
      setStatus((s) => (s === "saving" ? s : "unsaved"));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DEBOUNCE_MS);
    },
    [enabled, flush],
  );

  /** Save immediately and resolve once everything pending has been sent. */
  const saveNow = useCallback(async () => {
    for (let i = 0; i < 50 && inFlight.current; i++) await new Promise((r) => setTimeout(r, 100));
    await flush();
  }, [flush]);

  const overwrite = useCallback(() => flush({ force: true }), [flush]);

  const reloadLatest = useCallback(() => {
    skipUnloadPrompt.current = true;
    window.location.reload();
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (skipUnloadPrompt.current || (!hasPending() && !inFlight.current)) return;
      void flush();
      e.preventDefault();
      e.returnValue = "";
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onHidden);
      // Client-side navigation away (e.g. back to dashboard): send what's left.
      void flush();
    };
  }, [flush]);

  return { status, lastSavedAt, queue, saveNow, overwrite, reloadLatest };
}
