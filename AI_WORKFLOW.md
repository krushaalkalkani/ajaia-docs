# AI Workflow

> Template + running log. The log below was written during the build; edit the summary sections in your own words.

## Tools used

- **Claude Code** (Claude Opus) as a pair programmer in the terminal: scaffolding, writing code, running the build/tests, driving a browser to click through the app, and deploying with the `gh` and `vercel` CLIs.
- _Add anything else you used (ChatGPT, Copilot, Cursor, v0…)._

## Where AI sped me up

- _Your words here._ Suggestions from the log: scaffolding the Next.js/Prisma/Tiptap stack and the API surface in minutes; writing the boilerplate-heavy pieces (zod schemas, route handlers, share dialog); generating a `.docx` test fixture in code instead of hand-making one; a fast first draft of these docs.

## What I changed or rejected

- _Your words here._ See the log: dependency conflicts it had to work around, a bundle-size mistake it caught, a React effect bug, and design choices it proposed that were rejected (SQLite fallback) or kept (optimistic concurrency).

## How I verified correctness, UX and reliability

- **Automated:** `npm test` — 31 Vitest tests covering the access-control matrix (owner/editor/viewer/stranger, 404 vs 403), upload parsing for each file type and every rejection path, Markdown export, validation and cookie signing. `npm run build` and `tsc --noEmit` run before every deploy.
- **API checks in a real browser session:** scripted `fetch` calls for each role: editor PATCH → 200, viewer PATCH → 403, viewer listing shares → 403, stranger GET/PATCH → 404, editor sharing/deleting → 403, anonymous → 401, stale `baseUpdatedAt` → 409, bad JSON / wrong content shape / empty update → 400 with readable messages, `.png` upload → 415.
- **Manual UX pass:** signed in as each user, typed and formatted, watched *Unsaved → Saving → Saved*, reloaded to confirm formatting persisted, shared to a viewer and confirmed the read-only editor, tried an unknown email in the share dialog.
- **Production:** repeated the end-to-end flow on the deployed URL (see SUBMISSION.md).
- _Add your own checks._

---

## Running log — notable prompts and AI output I corrected

| # | Prompt / situation | What the AI produced or hit | Correction / decision |
|---|--------------------|-----------------------------|-----------------------|
| 1 | Initial brief: build the whole app autonomously (stack, data model, features, ship steps). | Scaffolded Next 14 + Prisma 6 + Tiptap 2. | Pinned major versions (Prisma 6, Tiptap 2, zod 3) instead of "latest" to avoid breaking API changes in a timebox. |
| 2 | Installing dev deps | `npm install` failed: latest Vitest requires `@types/node` ≥ 22, scaffold shipped 20. | Pinned `@types/node@22` rather than `--legacy-peer-deps`. |
| 3 | npm 11 gates install scripts | Prisma's engine download and esbuild's binary install were silently skipped. | Explicitly approved only `prisma`, `@prisma/client`, `@prisma/engines`, `esbuild`, `fsevents` (`allowScripts` in package.json). Build also runs `prisma generate` explicitly. |
| 4 | "Use SQLite locally only if no DATABASE_URL" | Considered a dual-schema setup (Postgres + generated SQLite schema). | **Rejected**: two schemas and runtime path quirks for little gain. Postgres everywhere; README gives a one-line Docker Postgres. |
| 5 | Server-side upload conversion | First idea was `@tiptap/html`'s `generateJSON`, which needs a browser DOM in Tiptap 2. | Used ProseMirror's `DOMParser` with the shared editor schema + `linkedom`. Smoke-tested on markdown with a table and an `h4` before writing tests: both degrade to text correctly. |
| 6 | Saving Tiptap JSON with Prisma | Type error: zod's passthrough output isn't assignable to Prisma's `InputJsonValue`. | Added a `.transform()` on the validated schema rather than casting at each call site. |
| 7 | Local DB connection | `P1010 access denied` — URL had no role. | Set explicit role in `.env`. |
| 8 | Upload button (client component) | Imported `UPLOAD_ACCEPT` from `lib/upload.ts`, which would have pulled `mammoth` + `linkedom` into the browser bundle. | Caught before build; split constants into dependency-free `lib/upload-constants.ts`. |
| 9 | Share dialog | `useEffect` depended on the parent's inline `onClose`, so every parent re-render (each keystroke autosave status change) would refetch shares and steal focus. | Stored `onClose` in a ref; effect depends only on `load`. |
| 10 | Autosave design | Plain debounced PATCH = last-write-wins; two editors could silently overwrite each other. | Added optimistic concurrency (`baseUpdatedAt` → 409) and a conflict banner. Verified with a stale-timestamp request (409) in the browser. |
| 11 | Access semantics | Decided "no access" returns 404 (not 403) so document ids aren't confirmable; 403 only when the user can see the doc but lacks the level. | Encoded in `assertAccess` and covered by tests. |
| 12 | Provisioning Neon | The agent used `vercel integration add neon --yes`; CLI v59 has no `--yes` (it's `--non-interactive`). Install then required accepting Neon's Marketplace terms in a browser. | Switched flag; the human accepted the terms (an agent shouldn't accept legal terms on someone's behalf), then the install was retried. |
| 13 | TypeScript target | `[...string]` failed under the scaffold's default target. | Used `split("")`, set `target: ES2020`. |

_Add rows as you keep working._
