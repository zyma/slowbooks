# Slow Books design system (master)

Source of truth for the look of the site. It describes what is already in the code;
the code wins if the two disagree (`src/app/globals.css`, `src/components/styles.ts`,
`src/app/[locale]/layout.tsx`). Page-specific rules go in `pages/<page>.md` and override this file.

Do not replace these values with suggestions from design tools (generated palettes,
font pairings, SaaS patterns). Use the tools for UX checks and ideas, then fit the result to this file.

## Mood

"Reading room": warm newsprint paper, near-black ink, a family book, with colour taken from the photos.
Content first: the photo and the story are the interface. Lively, not loud.

## Colour

Colour comes only from photos. On the landing the table under the book takes a bright tone from the open spread
(sky, rose, honey, green) and changes as the pages turn; the sections below use the same tones.
Inside the app surfaces still differ only by tone. Shadows only on loose paper objects (cards, a book cover) so they read
as things on a table; never on buttons, fields or panels.

| Token | Value | Use |
|-------|-------|-----|
| `paper` | `#f7f4ed` | page background |
| `surface` | `#ffffff` | fields, cards, secondary button hover |
| `ink` | `#242424` | text, borders of secondary buttons |
| `ink-soft` | `#6b6b6b` | secondary text |
| `line` | `#d9d4c9` | hairlines, field borders |
| `button` | `#191919` | primary button fill |
| `wave-light` | `#c9c3b6` | unplayed part of the voice waveform |
| `album` | `#2e3236` | dark "table" under the page in share pictures |
| `print` | `#fbfaf7` | photo print paper |
| `pencil`, `pencil-soft` | `#c9ccc6`, `#9aa09b` | pencil notes and marks |
| `rec` | `#d23a2c` | recording only, nothing else is red |
| `page-ink`, `page-soft` | `#1d2024`, `#5e646b` | text on book pages |
| `graphite` | `#5f6661` | pencil notes |
| `sky`, `sky-soft` | `#a9d6f0`, `#cfe9ff` | bright tone (chat mock) |
| `rose` | `#f6b3c3` | bright tone |
| `honey`, `honey-soft` | `#f6d47a`, `#ffe9a8` | bright tone (the "then a book" section) |
| `berry` | `#8c1d3f` | book cover, progress |

Table colours per sample spread live in `src/app/[locale]/LandingBook.tsx` as sample data.

Use the Tailwind names (`bg-paper`, `text-ink-soft`, ...). No raw hex in components.

## Type

- Alegreya (serif) for headings and stories, Alegreya Sans for the interface, Caveat (`font-hand`) for pencil notes. All with Cyrillic.
- Pencil notes: short, lower case, slightly rotated, in `graphite`. A few per spread, never on buttons or forms.
- Headings: weight 400, letter-spacing -0.015em. No bold headings.
- Interface text 16 to 18px; fields 17px; buttons 18px. Large headings 36 to 46px.
- Story text measures about 24 to 36em wide.

## Shape and components

- Buttons are pills (`rounded-full`), min height 52px. Shared classes in `src/components/styles.ts`:
  `buttonPrimary` (black pill), `buttonSecondary` (outlined pill), `field` (square white field), `recordDot`.
- Photos, cards and fields have square corners.
- Focus: 2px outline in `currentColor`, offset 3px. Never remove it.
- No icon library. Prefer words over icons; if an icon is needed, inline SVG, never emoji.

## Layout

- Page width up to 1200px; reading and form columns 420 to 620px.
- Mobile first. Touch targets at least 44px. Check 390, 768, 1024 and 1440px; no horizontal scroll.
- Landing book: one page under 640px, the open spread under the captions from 640px, the spread beside a 400px caption column from 1280px.
- The book turns left and right (click a page, arrows, swipe, keys); vertical scroll always scrolls the page.

## Motion

- Rare and slow: a page turn (1.1s), the table colour easing to the next spread, a soft pulse on the live recording button.
- Every animation has a `prefers-reduced-motion` fallback.

## Languages

RU, EN, ES, DE. Leave room for longer German and Russian labels; do not size buttons to English text.
