# Submission — Ajaia Docs

**Candidate assessment:** AI-Native Full Stack Developer, Ajaia

| | |
|---|---|
| **Live app** | https://ajaia-docs-coral-five.vercel.app |
| **Repository** | https://github.com/krushaalkalkani/ajaia-docs |
| **Walkthrough video** | _See [VIDEO_URL.txt](VIDEO_URL.txt)_ |

## Test accounts

Mocked auth — click a user on the sign-in page (no password).

| User | Email | Starts with |
|------|-------|-------------|
| Alice Anderson | `alice@ajaia.test` | Owns "Q3 Launch Plan" (shared with Bob as editor) |
| Bob Brown | `bob@ajaia.test` | "Q3 Launch Plan" under Shared with me |
| Carol Chen | `carol@ajaia.test` | Nothing — use for viewer / no-access checks |

## Deliverables included

| Deliverable | Where |
|-------------|-------|
| Source code | This repository (Next.js 14 App Router, TypeScript, Tailwind, Tiptap, Prisma/Postgres) |
| Deployed app | https://ajaia-docs-coral-five.vercel.app (Vercel + Neon Postgres) |
| README (setup, accounts, tests, upload types) | [README.md](README.md) |
| Architecture & trade-offs | [ARCHITECTURE.md](ARCHITECTURE.md) |
| AI workflow notes + build log | [AI_WORKFLOW.md](AI_WORKFLOW.md) |
| Automated tests (31, Vitest) | [`tests/`](tests) — `npm test` |
| Database schema + seed | [`prisma/schema.prisma`](prisma/schema.prisma), [`prisma/seed.ts`](prisma/seed.ts) |
| Walkthrough video | [VIDEO_URL.txt](VIDEO_URL.txt) (placeholder) |

## What works

_Verified on the live URL on 2026-11-24: Alice creates → formats → shares with Bob; Bob sees it under “Shared with me” and can edit; Carol gets “Document not found” (API 404); upload and Markdown export work._


- Mock sign-in as any seeded user; switch users from the header.
- Dashboard with **My documents** and **Shared with me** (shared badge with role and owner name), new document, upload, delete.
- Rich-text editor: inline title rename (empty → "Untitled document"), Bold / Italic / Underline / H1 / H2 / bulleted / numbered lists, undo/redo; formatting persists across reloads (stored as Tiptap JSON).
- Autosave (800 ms debounce) with *Unsaved / Saving… / Saved* status, retry on failure, leave-page guard, and **conflict detection** (409 + banner) so concurrent editors don't silently overwrite each other.
- Sharing: owner-only dialog to add by email as editor/viewer, change role, revoke. Viewers get a read-only editor; non-shared users get 404 (UI shows "Document not found").
- Upload `.txt`, `.md`, `.docx` (≤ 2 MB) → new editable document, with friendly errors for anything else.
- Export to Markdown (stretch).
- zod validation on every API input, consistent JSON errors, toasts for failures, 401/403/404 handled.
- All access checks centralized in `lib/access.ts`; 31 passing tests.

## What's incomplete / known limitations

- **No real-time co-editing.** Collaboration is asynchronous: two people editing at once get a conflict prompt rather than a live merge.
- **Auth is mocked** by design (signed cookie, no passwords).
- Sharing only works with existing (seeded) users; no invite-by-link.
- Uploads: tables/images become plain text; legacy `.doc` and PDF aren't supported.
- No version history (chose Markdown export as the stretch item).
- Schema managed with `prisma db push` rather than committed migrations.

## Next steps (2–4 more hours)

1. Version history (snapshots + restore).
2. Real-time collaboration with Yjs + Tiptap Collaboration.
3. Real auth (Auth.js / Clerk) behind the existing `getCurrentUser()` seam.
4. Playwright E2E for the share → view-only → revoke flow in CI.
5. Dashboard search/sort and "last edited by".
