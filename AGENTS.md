<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Slow Books project notes

- Reply to the project owner in Russian; code, comments and commit messages in English.
- Env is validated in `src/lib/env.ts`. Add new variables there and in `.env.example`.
- Locale param: always go through `resolveLocale(props.params)` from `src/i18n/locale.ts` so next-intl gets a typed locale.
- Protected routes live under `src/app/[locale]/app`. `src/proxy.ts` does only an optimistic cookie check; real checks use `getSession()` from `src/lib/session.ts`.
- Content vs layout: `entries` are content, `books.spreads` (JSON) is layout. Do not put layout fields on entries.
- Speech to text runs in the browser (Web Speech API) while the person talks; the recording is kept too. Gemini (free tier, `GEMINI_API_KEY`) does the light cleanup and transcribes the recording when the browser could not. No Deepgram, no Claude. Text polish must preserve the speaker's voice (light cleanup by default).
- A "moment" is one `entries` row (photo + story) with a public `shareId`. Guests create moments through the better-auth anonymous plugin; signing in moves their data (`moveGuestData`, `/api/claim`).
- Postgres is external (managed). Never assume a local one; `DATABASE_URL` is the only source of truth. `pnpm services:up` starts MinIO only; `pnpm db:local` is an optional offline fallback on :5433. Schema changes: edit `src/db/schema/*`, then `pnpm db:push` in dev, `pnpm db:generate` for migrations.
