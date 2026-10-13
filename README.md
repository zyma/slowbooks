# Slow Books

A photo book made from your voice. The user adds a photo, records a short story about it, repeats.
We transcribe the recordings, clean them up gently, and lay everything out as a printable book.

Languages: English, Russian, Spanish, German.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind 4)
- External managed Postgres + Drizzle ORM
- better-auth with magic links (no passwords)
- next-intl for i18n
- S3-compatible storage (MinIO locally, R2 or S3 in production)
- Deepgram for speech to text, Claude for text polishing (stage 2)

## Local setup

The database is a managed Postgres outside this repo. Put its connection string in `DATABASE_URL`
(with `?sslmode=require` if the provider needs SSL). For offline work there is an optional local one:
`pnpm db:local` starts Postgres on port 5433.

```bash
pnpm install
cp .env.example .env.local        # set DATABASE_URL and BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm services:up                  # MinIO on :9000 (console :9001). Postgres is external, set DATABASE_URL
set -a; source .env.local; set +a
pnpm db:push                      # create tables
pnpm dev
```

Open http://localhost:3000. Without `RESEND_API_KEY`, magic links are printed to the dev server console.

## Project layout

```
src/app/[locale]/        pages: landing, login, app (books list)
src/app/api/auth/        better-auth handler
src/db/schema/           auth tables + books, entries, assets, renders, orders
src/lib/                 env, auth, session, email, storage
src/i18n/                routing, navigation, request config, locale helper
src/proxy.ts             locale routing + optimistic auth redirect for /app
messages/                UI strings per language
```

## Data model in one paragraph

`entries` hold content (photo, audio, transcript, final text). `books.spreads` is a JSON array that holds
the arrangement (cover, title, story spreads with a layout, blanks). The editor rewrites `spreads`; the renderer
reads the same JSON to draw pages in the browser and in the print PDF.

## Roadmap

1. Foundation (done): auth, db, storage, i18n, landing, books list
2. Capture chat: photo upload, voice recording, Deepgram transcription, text polish
3. Book model and renderer: page components, themes, preview
4. Editor: reorder spreads, edit text, switch theme, cover
5. PDF export for print (Peecho spec)
6. Landing page polish
