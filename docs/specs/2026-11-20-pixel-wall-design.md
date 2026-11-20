# Pixel Wall and Last Visitor — Design

## Why

The draggable stickers at the top of the footer feel generic. The footer
should end the page with something that belongs to this site alone. A
shared 1-bit pixel wall does that: every visitor can flip pixels, the
picture stays for the next person, so the footer slowly becomes a drawing
made by strangers. A quiet "last visit from" line underneath shows the
site is lived in.

## Goals

- Replace the stickers with a shared 32 × 8 one-bit pixel wall.
- Anyone can flip pixels by clicking, tapping or dragging; everyone sees
  the same picture.
- One line under it: `last visit from Osaka, JP · 3m ago`, showing the
  visitor before you, never yourself.
- Same look as the banner: the site's dark, blue and pale tones, sharp
  pixels, light and dark themes.
- Works at every width, from a 360px phone to a wide monitor.

## Non-goals

- No colours beyond on/off, no drawing tools, no undo.
- No accounts, names or messages.
- No new secret; the count stays x/6.
- No live push updates; a light refresh is enough.

## Anti-goals

- Storing IP addresses or anything that identifies a visitor.
- One person wiping or scribbling over the whole wall in seconds.
- The footer breaking or looking empty when the database is down or not
  set up (local development).

## Approaches considered

1. **Shared pixel wall + last-visitor line, on a small Redis store** —
   chosen. Unique to the site, fits the 1-bit style, small and cheap.
2. **Last-visitor line alone** — easy, but too quiet to replace the toy.
3. **88×31 button row** — no database and no risk, but it is a style, not
   something to play with.

## Design

**Storage.** Upstash Redis, added by the owner from the Vercel dashboard
(free tier). The wall is one 256-character string of `0`/`1`; a flip is a
single `SETRANGE`, so two people drawing at once never overwrite each
other's other pixels. The last visitor is one small JSON value:
`{ city, country, at }`.

**API** (route handlers under `src/app/api/`):
- `GET /api/wall` → `{ cells: "0101…" }`, never cached.
- `POST /api/wall` with `{ i, on }` → sets one cell, returns the new wall.
  Rate limited to about 60 flips a minute per visitor, counted in Redis
  under a short-lived hashed key that expires after the minute.
- `DELETE /api/wall` with the owner's secret token header → wipes the
  wall. The token lives in a Vercel environment variable.
- `POST /api/visit` → reads the visitor's rough city from Vercel's
  geolocation, swaps it in as the new last visitor, and returns the
  previous one. Only city, country code and time are stored.
- Inputs are validated (cell index 0–255, boolean) and anything else is
  rejected with 400.

**Footer.** The stickers and "the labels are loose. drag them." go. In
their place:
- the wall, full column width, cells square, sharp, in the theme tones;
- a short line: `flip a pixel. everyone sees it.`;
- the last-visitor line, when there is one.
The clock, terminal button, secrets count and © line stay.

**Behaviour.**
- The wall loads when the footer scrolls into view, refreshes every ~20s
  while it is on screen, and pauses when it isn't.
- A flip shows instantly, then is sent; if the server refuses (rate limit
  or offline) the pixel flips back.
- Dragging paints: the first cell decides whether the drag turns pixels on
  or off.
- Keyboard: the wall is one focusable element; arrow keys move a visible
  cursor, Space or Enter flips.
- Screen readers get a label describing it; the drawing itself is
  decorative.
- If the API is unreachable or Redis isn't configured, the wall shows
  read-only and blank with `wall offline.` instead of the prompt, and the
  last-visitor line is left out.

**Responsive.** The grid is always 32 × 8 so everyone sees the same
picture. Cells scale with the column: about 21px on desktop, about 11px
on a phone. Phones draw by tap and drag.

## Builder's calls

- Exact cell gap, cursor style and hover tint.
- Env var names: support both Vercel's `KV_REST_API_URL` /
  `KV_REST_API_TOKEN` and Upstash's `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN`.
- Pure helpers (cell parsing, flip, paint-drag logic, "3m ago" text) live
  in `src/lib/` with vitest tests, like the terminal and runner.
