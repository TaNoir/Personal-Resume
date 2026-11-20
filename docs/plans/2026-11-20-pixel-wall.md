# Pixel Wall Implementation Plan

**Goal:** Replace the footer stickers with a shared 32 × 8 one-bit pixel wall and a "last visit from" line, backed by Upstash Redis.

**Architecture:** Pure helpers in `src/lib/wall.ts` (tested). A small server-only store in `src/lib/store.ts` wraps Redis and returns `null` when it isn't configured. Two route handlers serve the wall and the visit. One client component draws the wall on a canvas and handles pointer, touch and keyboard input.

**Tech Stack:** Next.js 16.4.6 route handlers, React 19, `@upstash/redis` 1.41.0, `@vercel/functions` 3.11.3 (`geolocation`), vitest.

**Spec:** `docs/specs/2026-11-20-pixel-wall-design.md`

## Global Constraints

- Grid is exactly 32 columns × 8 rows = 256 cells, stored as a 256-character `0`/`1` string under Redis key `wall`.
- Last visitor stored under key `visit` as `{ city: string, country: string, at: string /* ISO */ }`. Never store or log IPs.
- Rate limit: 60 flips per visitor per 60 s; key `rl:<sha256(ip) first 16 hex>`, expires 60 s.
- Env: Redis from `KV_REST_API_URL`/`KV_REST_API_TOKEN`, else `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`; wipe token from `WALL_ADMIN_TOKEN`, sent as header `x-wall-token`.
- Copy: prompt `flip a pixel. everyone sees it.`; offline `wall offline.`; visit line `last visit from <City>, <CC> · <ago>`.
- No sound, no new secret, no new client dependencies. Commits authored as the user only, plain sentence messages.

## Review Focus

- Malformed POST bodies (`i` = -1, 256, 3.5, "4", missing `on`) → 400, wall unchanged. Pinned in Task 1 (`parseFlip`) and Task 2.
- Redis not configured (local dev, preview without env) → GET returns 503, the footer shows `wall offline.` and no visit line; nothing throws. Pinned in Task 2 and checked in Task 4.
- A stored wall value that is missing, short or contains other characters → treated as blank/normalised, never crashes the canvas. Pinned in Task 1 (`parseCells`).
- Geolocation missing city (local, some networks) → visit is still recorded only if both city and country exist; otherwise the previous visitor is returned unchanged. Pinned in Task 1 (`parseVisit`).
- Wipe without the right token → 401, wall unchanged. Pinned in Task 2.

---

### Task 1: Pure wall and visit helpers

**Files:**
- Create: `src/lib/wall.ts`, `src/lib/wall.test.ts`

**Interfaces:**
- Produces:
  - `COLS = 32`, `ROWS = 8`, `CELLS = 256`, `BLANK: string` (256 `"0"`s)
  - `parseCells(raw: unknown): string` — 256-char `0`/`1`; non-string → `BLANK`; other chars → `"0"`; short → padded with `"0"`; long → cut.
  - `parseFlip(body: unknown): { i: number; on: boolean } | null` — `i` integer 0–255, `on` boolean, else null.
  - `setCell(cells: string, i: number, on: boolean): string`
  - `type Visit = { city: string; country: string; at: string }`
  - `parseVisit(raw: unknown): Visit | null` — all three non-empty strings, `at` parses as a date; city trimmed to 40 chars, country to 2.
  - `visitLine(v: Visit, now: Date): string` → `last visit from Osaka, JP · 3m ago` (uses `ago` from `src/lib/ago.ts`).

- [ ] **Step 1: Write failing tests** in `src/lib/wall.test.ts`:
  - `parseCells(undefined)` and `parseCells(42)` equal `BLANK`; `parseCells("1".repeat(300))` has length 256; `parseCells("1x1")` starts `"101"` and has length 256.
  - `parseFlip({ i: 0, on: true })` → `{ i: 0, on: true }`; `parseFlip({ i: 255, on: false })` ok; `-1`, `256`, `3.5`, `"4"`, `{ i: 1 }`, `null` → `null`.
  - `setCell(BLANK, 3, true)[3] === "1"` and length stays 256; `setCell(…, 3, false)[3] === "0"`.
  - `parseVisit({ city: "Osaka", country: "JP", at: "2026-11-20T10:00:00Z" })` returns it; missing city / bad date → `null`.
  - `visitLine({ city: "Osaka", country: "JP", at: "2026-11-20T10:00:00Z" }, new Date("2026-11-20T10:03:00Z"))` → `"last visit from Osaka, JP · 3m ago"`.
- [ ] **Step 2:** `npx vitest run src/lib/wall.test.ts` → FAIL (module not found).
- [ ] **Step 3:** Implement `src/lib/wall.ts`.
- [ ] **Step 4:** `npx vitest run src/lib/wall.test.ts` → PASS.
- [ ] **Step 5:** Commit `Add the pixel wall's cell and visit helpers`.

### Task 2: Redis store and route handlers

**Files:**
- Modify: `package.json` (add `@upstash/redis@1.41.0`, `@vercel/functions@3.11.3`)
- Create: `src/lib/store.ts`, `src/app/api/wall/route.ts`, `src/app/api/visit/route.ts`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces:
  - `store.ts`: `redis(): Redis | null`; `readWall(): Promise<string | null>`; `flipCell(i, on): Promise<string | null>` (`SETRANGE wall i "1"|"0"` after `SET wall BLANK NX`, then read); `allowFlip(ip: string): Promise<boolean>` (`INCR` + `EXPIRE 60` on first hit, allow ≤ 60); `wipeWall(): Promise<void>`; `swapVisit(v: Visit): Promise<Visit | null>` (`GET` old, `SET` new, return old parsed); `lastVisit(): Promise<Visit | null>`.
  - `GET /api/wall` → 200 `{ cells }` | 503 `{ error: "offline" }`. Header `Cache-Control: no-store`.
  - `POST /api/wall` body `{ i, on }` → 200 `{ cells }` | 400 | 429 | 503.
  - `DELETE /api/wall` header `x-wall-token` → 204 | 401 | 503. 401 also when `WALL_ADMIN_TOKEN` is unset.
  - `POST /api/visit` → 200 `{ last: Visit | null }` | 503. Visitor IP for rate limit from `x-forwarded-for` first entry (hashed, never stored raw). City via `geolocation(request)` from `@vercel/functions`, `decodeURIComponent`-ed; if city or country missing, return `lastVisit()` without writing.

- [ ] **Step 1:** `npm install @upstash/redis@1.41.0 @vercel/functions@3.11.3`.
- [ ] **Step 2:** Implement `store.ts` and both routes per the interfaces. Each handler awaits `connection()` or reads the request so it is never prerendered.
- [ ] **Step 3:** With no Redis env locally, `npm run dev` then `curl -i localhost:3000/api/wall` → `503`; `curl -i -X POST localhost:3000/api/wall -d '{"i":999,"on":true}'` → `400`; `curl -i -X DELETE localhost:3000/api/wall` → `401` or `503`.
- [ ] **Step 4:** `npx tsc --noEmit && npx eslint src` clean.
- [ ] **Step 5:** Commit `Serve the pixel wall and last visitor from Redis`.

### Task 3: Pixel wall component and footer

**Files:**
- Create: `src/components/PixelWall.tsx`
- Modify: `src/app/page.tsx` (footer), `src/app/globals.css` (drop `.stickers`/`.sticker*` incl. the mobile `.sticker:nth-child(3)` rule; add `.wall*`)
- Delete: `src/components/Stickers.tsx`

**Interfaces:**
- Consumes: `/api/wall`, `/api/visit`, `COLS`, `ROWS`, `BLANK`, `parseCells`, `setCell`, `parseVisit`, `visitLine`.
- Produces: `<PixelWall />` (default export, no props).

Behaviour (from the spec):
- Canvas 32 × 8 device pixels, CSS `width: 100%; aspect-ratio: 4 / 1; image-rendering: pixelated`; colours read from `--pale` (on), `--line` (off grid) and `--bg`, repainted on `subscribeTheme`.
- Fetch the wall when it scrolls into view (IntersectionObserver), poll every 20 s while visible; skip a poll while a drag is in progress.
- Pointer: `pointerdown` picks a cell, mode = opposite of its state, then `pointermove` paints cells in that mode; each changed cell updates locally at once and POSTs; on a non-200 revert that cell. `touch-action: none` on the canvas.
- Keyboard: canvas `tabIndex={0}`, `role="img"`, `aria-label="Shared pixel wall, 32 by 8. Arrow keys move, space flips."`; arrows move a cursor cell drawn as a blue outline while focused; Space/Enter flips.
- Visit: on mount, once per session (`sessionStorage` key `visited`), `POST /api/visit`; render `visitLine(last, new Date())` when `last` exists.
- Offline (any 503 / network error on load): draw blank, ignore input, show `wall offline.` instead of the prompt, no visit line.
- Footer: replace `<Stickers />` and the "labels are loose" paragraph with `<PixelWall />` placed above the clock row; the wall block spans the full footer width (`flex-basis: 100%`) and footer `padding-top` drops from `6.5rem` to `2rem`.

- [ ] **Step 1:** Build the component, swap the footer, update CSS, delete `Stickers.tsx`.
- [ ] **Step 2:** `npx tsc --noEmit && npx eslint src && npm test` clean.
- [ ] **Step 3:** In the preview without Redis: footer shows the blank wall and `wall offline.`; no console errors; at 390 px the wall is full width with no horizontal overflow; light and dark themes both readable.
- [ ] **Step 4:** Commit `Replace the footer stickers with a shared pixel wall`.

### Task 4: Connect Redis and verify live

- [ ] **Step 1:** Owner adds Upstash Redis to the Vercel project (Storage → Marketplace → Upstash → Redis, free plan, connect to Personal-Resume) and adds `WALL_ADMIN_TOKEN` (a long random string) in Project → Settings → Environment Variables.
- [ ] **Step 2:** Push, wait for deploy. On the live site: flip a pixel, reload, it persists; second browser sees it within 20 s; the visit line appears on a second visit; 61 rapid flips → later ones revert (429).
- [ ] **Step 3:** `curl -X DELETE -H "x-wall-token: …" https://amorcillo.vercel.app/api/wall` → 204 and the wall is blank (owner runs it; token never pasted in chat).
