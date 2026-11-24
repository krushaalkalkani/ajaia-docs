# Ajaia Docs

A lightweight collaborative document editor inspired by Google Docs, built as a timeboxed (~4h) assessment for Ajaia's AI-Native Full Stack Developer role.

Create rich-text documents, rename them inline, autosave as you type, upload `.txt` / `.md` / `.docx` files as new editable documents, and share documents with other users as **editors** or **viewers**.

- **Live app:** https://ajaia-docs-coral-five.vercel.app
- **Repository:** https://github.com/krushaalkalkani/ajaia-docs
- **Hosting:** Vercel (auto-deploys from `main`) + Neon Postgres (free tier)

## Test accounts

Authentication is mocked: the sign-in page lists the seeded users and you click one ("Sign in as…"). No passwords.

| User | Email | Seeded data |
|------|-------|-------------|
| Alice Anderson | `alice@ajaia.test` | Owns **"Q3 Launch Plan"**, shared with Bob as editor |
| Bob Brown | `bob@ajaia.test` | Sees "Q3 Launch Plan" under **Shared with me** (can edit) |
| Carol Chen | `carol@ajaia.test` | No documents — use her to test viewer access and "no access" |

**Two-minute tour:** sign in as Alice → open *Q3 Launch Plan* → type and format (watch *Saving… → Saved*) → **Share** → add `carol@ajaia.test` as **Viewer** → *Switch user* → Carol → the doc is under *Shared with me* and opens read-only.

## Features

- **Dashboard** — "My documents" and "Shared with me" (shared badge with role + owner's name), New document, Upload file, Delete (owner).
- **Editor** (Tiptap) — inline title rename; toolbar for Bold, Italic, Underline, Heading 1/2, bulleted and numbered lists, undo/redo (plus the usual keyboard shortcuts). Content is stored as Tiptap JSON so formatting is preserved exactly on reopen.
- **Autosave** — debounced (800 ms) and serialized; status shows *Unsaved changes / Saving… / Saved just now / Not saved*. Failed saves retry; leaving the page with unsaved changes prompts first. If someone else saved the doc since you loaded it, you get a conflict banner (*Load their version* / *Keep mine*) instead of silently overwriting their work.
- **Sharing** — owner-only Share dialog: add a user by email as editor or viewer, change role, revoke. Viewers get a read-only editor; users without access get a "not found" page (API returns 404).
- **Upload** — `.txt`, `.md` (`.markdown`), `.docx`, **max 2 MB**. Each upload creates a **new** editable document titled after the file. Headings, bold/italic/underline and lists are preserved; unsupported constructs (tables, images) degrade to plain text.
- **Export to Markdown** (stretch) — "Export .md" on any document you can read.

### Supported upload types

| Type | Extensions | How it's converted |
|------|-----------|--------------------|
| Plain text | `.txt` | Blank lines → paragraphs, single newlines → line breaks |
| Markdown | `.md`, `.markdown` | `marked` → HTML → editor schema |
| Word | `.docx` | `mammoth` → HTML → editor schema (legacy `.doc` is **not** supported) |

Maximum file size is **2 MB**. Anything else is rejected with a clear message (415 / 413 / 422).

## Local setup

Requires Node 20+ and any Postgres database (a free [Neon](https://neon.tech) database or local Postgres).

```bash
git clone https://github.com/krushaalkalkani/ajaia-docs.git
cd ajaia-docs
npm install
cp .env.example .env          # then set DATABASE_URL / DATABASE_URL_UNPOOLED / AUTH_SECRET
```

No Postgres handy? Start one with Docker (matches the defaults in `.env.example`):

```bash
docker run -d --name ajaia-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ajaia_docs postgres:16
```

Create the tables, seed the test users and sample document, and run the app:

```bash
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000 and pick a user.

### Environment variables

| Name | Purpose |
|------|---------|
| `DATABASE_URL` | Postgres connection string used by the app (pooled on Neon) |
| `DATABASE_URL_UNPOOLED` | Direct connection used by `prisma db push` (same as above for local Postgres) |
| `AUTH_SECRET` | HMAC key that signs the mock session cookie |

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate` + production build |
| `npm test` | Run the Vitest suite once |
| `npm run db:push` | Sync the Prisma schema to the database |
| `npm run db:seed` | Seed 3 users + 1 shared sample document (idempotent) |

## Tests

```bash
npm test
```

31 tests across `tests/`:

- `access.test.ts` — owner / editor / viewer / no-access matrix for `canRead`, `canEdit`, `isOwner`; 404 vs 403 semantics of `assertAccess`; `loadDocumentForUser` only loads the caller's own share row.
- `upload.test.ts` — `.txt`, `.md` and `.docx` parsing (the `.docx` fixture is built in-test), unsupported / empty / oversized / corrupt files, script stripping.
- `markdown.test.ts` — Tiptap JSON → Markdown export.
- `validation.test.ts` — zod schemas (titles, content shape and size, share input).
- `auth.test.ts` — the session cookie can't be forged or tampered with.

## Project structure

```
app/
  page.tsx                 Dashboard (server component)
  login/page.tsx           "Sign in as" picker
  docs/[id]/page.tsx       Editor page (access-checked on the server)
  api/                     Route handlers — every one calls requireUser() + lib/access
components/
  editor/                  DocumentEditor, Toolbar, ShareDialog, useDocumentSaver (autosave)
lib/
  access.ts                The single place access rules live
  auth.ts                  Mock auth: signed httpOnly cookie
  validation.ts            zod schemas for every API input
  upload.ts                File → Tiptap JSON (txt / md / docx)
  markdown.ts              Tiptap JSON → Markdown export
  tiptap/                  Shared editor schema + server-side HTML → JSON
prisma/                    schema.prisma, seed.ts
tests/                     Vitest suites
```

More detail: [ARCHITECTURE.md](ARCHITECTURE.md) · [AI_WORKFLOW.md](AI_WORKFLOW.md) · [SUBMISSION.md](SUBMISSION.md)
