# Architecture

## Stack and why

| Layer | Choice | Why |
|-------|--------|-----|
| App | **Next.js 14 (App Router) + TypeScript** | One deployable for UI and API. Server components render the dashboard and editor shell with access already checked; route handlers serve the JSON API. |
| Styling | **Tailwind CSS** | Fast to build a clean, consistent UI without a component library. |
| Editor | **Tiptap 2** (StarterKit + Underline) | ProseMirror underneath: a real document schema, reliable formatting, undo history, keyboard shortcuts. Content is stored as **Tiptap JSON**, not HTML, so it round-trips exactly and is safe to render. |
| Data | **Postgres + Prisma** (Neon free tier) | Relational fits users ↔ documents ↔ shares naturally; `Json` column holds the document. Prisma gives typed queries and a one-command schema push. |
| Validation | **zod** | Every API input is parsed by a schema; failures return a friendly 400. |
| Upload parsing | **mammoth** (.docx), **marked** (.md), **linkedom** | Convert to HTML, then let ProseMirror's own parser map that HTML onto the editor schema (see below). |
| Toasts | **sonner** | Small, accessible notifications. |
| Tests | **Vitest** | Fast, zero-config TypeScript tests. |
| Hosting | **Vercel** | Zero-config Next.js hosting, GitHub-connected so every push to `main` redeploys. Neon (us-east-1, same region as the functions) supplies `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct, for schema pushes). |

## Data model

```
User           id, email (unique), name, createdAt
Document       id, title, content (Json — Tiptap doc), ownerId → User, createdAt, updatedAt
DocumentShare  id, documentId → Document, userId → User, role ('editor' | 'viewer'), createdAt
               unique(documentId, userId)
```

- Ownership lives on `Document.ownerId`, not in the share table, so "who owns this" is never ambiguous and the owner can't be demoted by a share row.
- `unique(documentId, userId)` makes sharing idempotent: re-sharing with a different role is an upsert (that's how "change role" works).
- Cascading deletes: deleting a document removes its shares.
- Indexes: `(ownerId, updatedAt)` for "My documents", `userId` on shares for "Shared with me".

## Access model

All rules live in [`lib/access.ts`](lib/access.ts):

| Role | How you get it | Read | Edit content / rename | Share / revoke / delete |
|------|---------------|:----:|:----:|:----:|
| owner | created the document | ✅ | ✅ | ✅ |
| editor | shared with role `editor` | ✅ | ✅ | ❌ (403) |
| viewer | shared with role `viewer` | ✅ | ❌ (403) | ❌ (403) |
| none | — | ❌ (**404**) | ❌ (404) | ❌ (404) |

- `getRole(doc, userId)` is a pure function; `canRead` / `canEdit` / `isOwner` are thin wrappers, which is what the unit tests exercise.
- `assertAccess(doc, userId, level)` turns that into HTTP semantics: **no relationship → 404** (we don't reveal that a document id exists), **can see it but lacks the level → 403**.
- `loadDocumentForUser(id, userId, level)` is what every route handler and the editor page call. It loads the document with only the caller's own share row and runs `assertAccess`. There is no other access path.
- Identity comes only from the server: `requireUser()` reads the httpOnly session cookie (HMAC-signed so it can't be edited to impersonate another user id) and returns 401 if absent. No route trusts a user id from the request body.
- The UI mirrors the rules (viewers get a read-only editor and no toolbar; only owners see Share/Delete), but the server is the enforcement point.

## Notable implementation decisions

**Autosave that doesn't lose or clobber work** (`components/editor/useDocumentSaver.ts`). Edits merge into a pending patch and flush 800 ms after the last change. Only one save is in flight at a time; edits made during a save go out right after, so saves never race. Every save sends the `updatedAt` the client last saw; the server updates with `WHERE id = ? AND updatedAt = ?` and returns **409** if someone else saved in between. The editor then stops autosaving and offers *Load their version* or *Keep mine*. Network/5xx failures keep the patch and retry; leaving with unsaved changes triggers the browser's leave prompt; client-side navigation flushes first.

**Uploads go through the editor's own schema.** Each format is converted to HTML (mammoth for .docx, marked for .md), then parsed server-side by ProseMirror's `DOMParser` built from the *same* extension list the browser editor uses ([`lib/tiptap/extensions.ts`](lib/tiptap/extensions.ts)), with linkedom providing the DOM. That guarantees every imported document is valid for the editor: supported structure maps across, unsupported tags (tables, images, spans) flatten to text, and `<script>`/`<style>` are dropped. Plain text is converted directly (blank lines → paragraphs). Size (2 MB) and type are checked before parsing; corrupt .docx returns a friendly 422.

**Consistent API errors.** Route handlers are wrapped by `route()` in [`lib/http.ts`](lib/http.ts), which converts thrown `HttpError`s and `ZodError`s into `{ error: { message, code } }` with the right status, and hides unexpected errors behind a generic 500. The client `api()` helper surfaces `message` in toasts and redirects to sign-in on 401.

**Empty titles.** The title schema trims and collapses whitespace; an empty result becomes "Untitled document" on the server, and the input shows the fallback on blur.

## What I prioritized

1. **Correct, centralized access control** — the core risk in a sharing feature. One module, enforced on the server for every route and page, unit tested, and checked end to end (owner/editor/viewer/stranger/anonymous).
2. **The editing loop feeling solid** — formatting that survives reload, a trustworthy save indicator, no silent data loss (conflict detection, retry, leave guard).
3. **Upload that never produces a broken document**, with clear limits and messages.
4. **Reviewer experience** — seeded accounts, a one-click user switcher, docs that explain the trade-offs, and a deployed URL.

## What I deliberately cut, and why

| Cut | Why |
|-----|-----|
| **Real-time co-editing** (cursors, live merge via Yjs/CRDT + websockets) | The biggest single piece of work in a Docs clone and easy to get subtly wrong. In the timebox, safe *asynchronous* collaboration (sharing + conflict detection) is the better trade. Tiptap has a Yjs path for later. |
| **Real authentication** (passwords, OAuth, sessions table) | The brief allows mocked auth. The seam is small: `getCurrentUser()` is the only place identity comes from, so swapping in Auth.js/Clerk doesn't touch access logic. |
| **Comments, suggestions, presence** | Product surface area beyond the core loop. |
| **Version history** | Chose Markdown export as the one stretch item: smaller, fully testable, and useful. History is first on the "next" list. |
| **Sharing with people who don't have an account / link sharing** | Needs invitations and email; out of scope for mocked auth. |
| **Rich imports** (tables, images, .doc, PDF) | Would need schema extensions and file storage. Unsupported content degrades to text instead of failing. |
| **Pagination, search, folders** | Not needed at demo scale. |
| **Migrations** | `prisma db push` is fine for a fresh schema; a real project would commit `prisma migrate` history. |

## What I'd build next with 2–4 more hours

1. **Version history** — snapshot to a `DocumentVersion` table on a throttle (e.g. at most once every few minutes of active editing), list + preview + restore. This also makes the conflict resolution friendlier ("restore their version").
2. **Real-time collaboration** — Yjs + `@tiptap/extension-collaboration` over a websocket provider (Vercel Functions support websockets now, or Liveblocks/Hocuspocus), persisting the Yjs state alongside the JSON snapshot.
3. **Real auth** via Auth.js or Clerk, replacing only `lib/auth.ts`.
4. **Playwright E2E** for the sharing flow (owner shares → viewer sees read-only → revoke → 404) running in CI against a Neon branch.
5. **Dashboard search and sorting**, and "last edited by" on each document.
6. **Rate limiting and audit log** on share changes.
