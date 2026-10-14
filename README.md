# Slow Books

A photo book made from your voice. A person picks a photo and tells its story out loud: that is a "moment".
A moment gets its own page that can be shared (Instagram, Telegram, WhatsApp, LinkedIn) without an account.
With an account, moments are kept and later laid out as a printable book.

Languages: English, Russian, Spanish, German.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind 4)
- External managed Postgres + Drizzle ORM
- better-auth with magic links (no passwords)
- next-intl for i18n
- S3-compatible storage (MinIO locally, R2 or S3 in production)
- Speech to text in the browser (Web Speech API); Gemini free tier for light cleanup and as transcription fallback

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
src/app/[locale]/        pages: landing, moment/new (composer), m/[shareId] (public moment), login, app (my moments)
src/app/api/auth/        better-auth handler
src/app/api/claim/       moves a guest's moments to the account after the email sign-in
src/app/api/moments/     share image for Instagram Stories
src/db/schema/           auth tables + books, entries, assets, renders, orders
src/lib/                 env, auth, session, email, storage, moments, gemini, claim, share images
src/assets/fonts/        Alegreya TTF for share images (SIL OFL)
src/i18n/                routing, navigation, request config, locale helper
src/proxy.ts             locale routing + optimistic auth redirect for /app
messages/                UI strings per language
```

## Data model in one paragraph

`entries` hold content (photo, audio, transcript, final text). `books.spreads` is a JSON array that holds
the arrangement (cover, title, story spreads with a layout, blanks). The editor rewrites `spreads`; the renderer
reads the same JSON to draw pages in the browser and in the print PDF.

## Storage CORS

The browser uploads photos and recordings straight to the bucket with presigned URLs. MinIO allows this
by default. On S3 or R2 add a CORS rule that allows `PUT` from the site origin with the `Content-Type` header.

## Deploy

Production runs on one Oracle Cloud VM (Ampere A1, ARM) with Docker: the app plus Caddy for HTTPS.
Every push to `main` builds an ARM image in GitHub Actions, pushes it to `ghcr.io/zyma/slowbooks`,
then copies `deploy/` to the server and restarts the stack.

One-time setup:

1. GitHub variables (plain config): `DEPLOY_HOST` (server IP), `DOMAIN` (no domain yet: `<server-ip>.sslip.io`),
   `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_FORCE_PATH_STYLE`, `EMAIL_FROM`.
2. GitHub secrets: `DEPLOY_SSH_KEY` (private key that can log in as `ubuntu`), `DATABASE_URL`, `BETTER_AUTH_SECRET`,
   `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, optional `RESEND_API_KEY`, `GEMINI_API_KEY` (optional variable `GEMINI_MODEL`).
   Set them with `gh secret set NAME` (the value is read from a hidden prompt).
3. Open ports 80 and 443 in the cloud firewall.

The deploy job writes `~/slowbooks/.env` on the server from these values on every run, so edit them in GitHub,
not on the server. The job is skipped until `DEPLOY_HOST` is set.

## Roadmap

1. Foundation (done): auth, db, storage, i18n, landing, books list
2. Moments (in progress): landing, guest moment with photo + voice, browser speech to text, Gemini cleanup, share page and images, save to account
3. Book model and renderer: page components, themes, preview
4. Editor: reorder spreads, edit text, switch theme, cover
5. PDF export for print (Peecho spec)
6. Landing page polish
