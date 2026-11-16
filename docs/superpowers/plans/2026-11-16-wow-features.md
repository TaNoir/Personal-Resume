# Wow Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live Davao sky, six findable secrets with a terminal, and a 1-bit dog runner game to the portfolio site.

**Architecture:** All logic that can be pure (moon phase, weather mapping, relative time, secret list, terminal commands, game engine) lives in `src/lib/*.ts` with vitest tests. Thin client components draw it. Features talk to each other through `window` custom events, because they sit in different parts of the tree (layout and page).

**Tech Stack:** Next.js 16.4.6 App Router, React 19, TypeScript, plain CSS in `src/app/globals.css`, Canvas 2D, Web Audio, vitest (dev only).

**Spec:** `docs/superpowers/specs/2026-11-16-wow-features-design.md`

The plan has three phases. Each phase ends with a push to `main`, which deploys to Vercel, so each ships alone.

## Global Constraints

- No new runtime dependencies. The only new dev dependency is `vitest`.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (AGENTS.md).
- Commits carry **no** `Co-Authored-By` or other Claude attribution. Plain sentence messages, like the existing history.
- Every feature works in dark and light themes (`data-theme` on `<html>`) and at 375px width, inside the existing narrow column.
- All motion respects `prefers-reduced-motion: reduce`.
- Audio never starts by itself.
- Any `localStorage` read or write is wrapped in `try/catch`; the page must work with storage blocked.
- Terminal output is rendered as React text nodes. Never `dangerouslySetInnerHTML`.
- If a CSS change does not show in `next dev`: stop the server, delete `.next`, restart.
- Verify each task with `npx vitest run`, `npx tsc --noEmit` and `npm run build`. (`tsc` may report `Cannot find name 'LayoutProps'` right after `.next` is deleted; it clears after a build.)

## Review Focus

1. **Open-Meteo is down, slow, or returns an unexpected shape.** The banner keeps its fallback sky and old caption; nothing throws. (Task 1 test: `toSkyState` on `{}` and `null`; Task 3 manual check with the request blocked.)
2. **`localStorage` holds garbage or is blocked.** Secrets count reads as 0 and best score as 0; nothing throws. (Task 4 test: `parseSecrets("not json")`; Task 8 test: `parseBest("abc")`.)
3. **Hostile or odd terminal input**: `<img onerror=...>`, 5,000 characters, only spaces. Printed back as plain text, truncated to 200 characters, empty input prints nothing. (Task 5 tests.)
4. **The tab is hidden mid-game and comes back seconds later.** The dog must not teleport through a chimney: a single step never advances more than 50 ms. (Task 8 test.)
5. **Keyboard shortcuts firing at the wrong time.** Backtick and the Konami keys must not act while the terminal input has focus; Space must not scroll the page while the game dialog is open. (Tasks 6, 7, 9 manual checks.)

---

## File Structure

| File | Responsibility |
|---|---|
| `vitest.config.ts` | Test runner config with the `@/` alias |
| `src/lib/sky.ts` | Pure: moon phase, WMO code mapping, `SkyState`, caption text |
| `src/lib/ago.ts` | Pure: relative time text |
| `src/lib/github.ts` | Add `getLastPush` |
| `src/components/SkyBanner.tsx` | Client: fetches weather, renders `<figure>` with sky and caption |
| `src/components/DitherSky.tsx` | Takes a `sky` prop; draws cloud cover, rain, moon, day/night |
| `src/components/Ago.tsx` | Client: renders `ago()` after mount |
| `src/lib/secrets.ts` | Secret ids, pure list helpers, storage, `useSecrets` |
| `src/lib/terminal.ts` | Pure: `run(input, ctx)` command interpreter |
| `src/lib/theme.ts` | `setTheme` moved out of `ThemeToggle` so the terminal can call it |
| `src/components/Terminal.tsx` | Client: the terminal dialog |
| `src/lib/konami.ts` | Pure: key sequence matcher |
| `src/components/Secrets.tsx` | Client: Konami, bite, bark, console note, toast, rot mode |
| `src/components/SecretCount.tsx` | Client: footer counter and terminal button |
| `src/components/RotPlayer.tsx` | Listens for `rot:radio`; adds the secret track |
| `src/lib/runner.ts` | Pure: game engine |
| `src/components/DogRunner.tsx` | Client: game dialog, canvas, input |

Window events (all `CustomEvent`): `rot:terminal` (open), `rot:radio` (detail `"play" | "pause" | "next"`), `rot:bark`, `rot:play` (open game), `rot:secret` (detail `{ id, count }`, fired after the stored list changes).

---

# Phase 1: Live sky

### Task 1: Test runner and sky maths

**Files:**
- Create: `vitest.config.ts`, `src/lib/sky.ts`, `src/lib/sky.test.ts`, `src/lib/ago.ts`, `src/lib/ago.test.ts`
- Modify: `package.json` (add `"test": "vitest run"`, dev dependency `vitest`)

**Interfaces:**
- Produces:
  - `type SkyState = { cloud: number; rain: 0 | 1 | 2; night: boolean; tempC: number | null; label: string; moon: number }`
  - `moonCycle(date: Date): number` (0..1; 0 = new, 0.5 = full)
  - `moonName(cycle: number): string`
  - `conditions(code: number): string`
  - `rainLevel(code: number, mm: number): 0 | 1 | 2`
  - `davaoNight(date: Date): boolean`
  - `fallbackSky(date: Date): SkyState`
  - `toSkyState(json: unknown, date: Date): SkyState | null`
  - `caption(sky: SkyState): string | null` (null when `tempC` is null)
  - `ago(iso: string, now: Date): string`

- [ ] **Step 1: Install vitest and add config**

Run: `npm install -D vitest`. `vitest.config.ts` sets `resolve.alias` `@` → `./src` and `test.environment: "node"`.

- [ ] **Step 2: Write the failing tests**

```ts
// src/lib/sky.test.ts
import { describe, expect, it } from "vitest";
import { caption, conditions, davaoNight, fallbackSky, moonCycle, moonName, rainLevel, toSkyState } from "./sky";

describe("moon", () => {
  it("is new on 2024-01-11 and full on 2024-01-25", () => {
    const n = moonCycle(new Date("2024-01-11T11:57:00Z"));
    expect(Math.min(n, 1 - n)).toBeLessThan(0.03);
    expect(Math.abs(moonCycle(new Date("2024-01-25T17:54:00Z")) - 0.5)).toBeLessThan(0.03);
  });
  it("names the eight phases", () => {
    expect(moonName(0)).toBe("new moon");
    expect(moonName(0.125)).toBe("waxing crescent");
    expect(moonName(0.25)).toBe("first quarter");
    expect(moonName(0.375)).toBe("waxing gibbous");
    expect(moonName(0.5)).toBe("full moon");
    expect(moonName(0.625)).toBe("waning gibbous");
    expect(moonName(0.75)).toBe("last quarter");
    expect(moonName(0.875)).toBe("waning crescent");
    expect(moonName(0.99)).toBe("new moon");
  });
});

describe("weather", () => {
  it("maps WMO codes", () => {
    expect(conditions(0)).toBe("clear");
    expect(conditions(2)).toBe("partly cloudy");
    expect(conditions(3)).toBe("overcast");
    expect(conditions(48)).toBe("fog");
    expect(conditions(53)).toBe("drizzle");
    expect(conditions(63)).toBe("rain");
    expect(conditions(81)).toBe("rain");
    expect(conditions(96)).toBe("thunderstorm");
    expect(conditions(71)).toBe("cloudy");
  });
  it("grades rain", () => {
    expect(rainLevel(3, 0)).toBe(0);
    expect(rainLevel(61, 0.4)).toBe(1);
    expect(rainLevel(3, 0.2)).toBe(1);
    expect(rainLevel(61, 2.5)).toBe(2);
    expect(rainLevel(65, 0)).toBe(2);
    expect(rainLevel(95, 0)).toBe(2);
  });
  it("knows Davao night is 18:00 to 05:59 local (UTC+8)", () => {
    expect(davaoNight(new Date("2026-11-16T10:00:00Z"))).toBe(true); // 18:00
    expect(davaoNight(new Date("2026-11-16T21:59:00Z"))).toBe(true); // 05:59
    expect(davaoNight(new Date("2026-11-16T22:00:00Z"))).toBe(false); // 06:00
    expect(davaoNight(new Date("2026-11-16T09:59:00Z"))).toBe(false); // 17:59
  });
  it("reads an Open-Meteo reply", () => {
    const at = new Date("2026-11-16T10:30:00Z");
    const sky = toSkyState(
      { current: { temperature_2m: 25.8, cloud_cover: 100, precipitation: 0, weather_code: 3, is_day: 0 } },
      at,
    );
    expect(sky).toMatchObject({ cloud: 1, rain: 0, night: true, tempC: 25.8, label: "overcast" });
    expect(caption(sky!)).toBe(`davao / 25.8°C / overcast / ${moonName(sky!.moon)}`);
  });
  it("leaves the moon out of the caption by day", () => {
    const sky = toSkyState(
      { current: { temperature_2m: 31, cloud_cover: 20, precipitation: 0, weather_code: 1, is_day: 1 } },
      new Date("2026-11-16T04:00:00Z"),
    );
    expect(caption(sky!)).toBe("davao / 31.0°C / partly cloudy");
  });
  it("rejects bad replies and falls back", () => {
    expect(toSkyState({}, new Date())).toBeNull();
    expect(toSkyState(null, new Date())).toBeNull();
    expect(toSkyState({ current: { temperature_2m: "hot" } }, new Date())).toBeNull();
    const f = fallbackSky(new Date("2026-11-16T10:00:00Z"));
    expect(f).toMatchObject({ cloud: 0.5, rain: 0, night: true, tempC: null });
    expect(caption(f)).toBeNull();
  });
});
```

```ts
// src/lib/ago.test.ts
import { expect, it } from "vitest";
import { ago } from "./ago";

it("formats relative time", () => {
  const now = new Date("2026-11-16T12:00:00Z");
  expect(ago("2026-11-16T11:59:40Z", now)).toBe("just now");
  expect(ago("2026-11-16T11:15:00Z", now)).toBe("45m ago");
  expect(ago("2026-11-16T09:00:00Z", now)).toBe("3h ago");
  expect(ago("2026-11-13T12:00:00Z", now)).toBe("3d ago");
  expect(ago("2026-08-16T12:00:00Z", now)).toBe("3mo ago");
  expect(ago("2026-11-17T12:00:00Z", now)).toBe("just now"); // clock skew
  expect(ago("nonsense", now)).toBe("");
});
```

- [ ] **Step 3: Run to confirm they fail**

Run: `npx vitest run` — Expected: FAIL, modules not found.

- [ ] **Step 4: Implement `src/lib/sky.ts` and `src/lib/ago.ts`**

Moon: synodic month `29.530588853` days, reference new moon `2000-01-06T18:14:00Z`; `cycle = (days since reference / synodic) mod 1`. `moonName` rounds `cycle * 8` to the nearest of eight bins. `ago` thresholds: under 60 s "just now", then minutes, hours (under 24), days (under 30), months (30-day).

- [ ] **Step 5: Run tests, then commit**

Run: `npx vitest run` — Expected: PASS.

```bash
git add package.json package-lock.json vitest.config.ts src/lib/sky.ts src/lib/sky.test.ts src/lib/ago.ts src/lib/ago.test.ts
git commit -m "Add sky maths and relative time helpers with tests"
```

### Task 2: "Last push" in the GitHub panel

**Files:**
- Modify: `src/lib/github.ts`, `src/app/page.tsx` (the `.graph-top` paragraph), `src/app/globals.css` (only if the line needs spacing)
- Create: `src/components/Ago.tsx`

**Interfaces:**
- Consumes: `ago(iso, now)` from Task 1.
- Produces: `getLastPush(user: string): Promise<string | null>` (ISO timestamp); `<Ago iso={string} />`.

- [ ] **Step 1: Add `getLastPush` to `src/lib/github.ts`**

Same pattern as `getLanguages` (`"use cache"`, `cacheLife("hours")`, `HEADERS`, `null` on any failure). Fetch `https://api.github.com/users/${user}/events/public?per_page=30`; return `created_at` of the first event whose `type` is `PushEvent`, `CreateEvent` or `PullRequestEvent`.

- [ ] **Step 2: Create `Ago.tsx`**

Client component. Renders nothing on the server and first paint (the page is cached, so "now" is only known in the browser); after mount renders `last push {ago(iso, new Date())}`, or nothing if `ago` returns `""`.

- [ ] **Step 3: Use it in `page.tsx`**

Add `getLastPush(github.handle)` to the existing `Promise.all`; render `{lastPush && <Ago iso={lastPush} />}` as a third item in `.graph-top`.

- [ ] **Step 4: Verify**

Run `npm run build` (Expected: succeeds, `/` still prerendered). Start `resume-dev`; the GitHub panel's top line shows `last push Nd ago` and does not wrap badly at 375px.

- [ ] **Step 5: Commit**

```bash
git add src/lib/github.ts src/components/Ago.tsx src/app/page.tsx src/app/globals.css
git commit -m "Show how long ago the last GitHub push was"
```

### Task 3: The banner shows Davao's real sky

**Files:**
- Create: `src/components/SkyBanner.tsx`
- Modify: `src/components/DitherSky.tsx`, `src/app/page.tsx` (replace the `<figure className="banner">` block), `src/app/globals.css` (only if the caption needs it)

**Interfaces:**
- Consumes: `SkyState`, `fallbackSky`, `toSkyState`, `caption` from Task 1.
- Produces: `<SkyBanner handle={string} />`; `<DitherSky sky={SkyState} />`.

- [ ] **Step 1: `SkyBanner.tsx`**

Client component rendering the same `<figure className="banner">` markup `page.tsx` has now. State starts as `null` (server and first paint render the old caption `sky.raw / 1-bit / {handle}`); in an effect, set `fallbackSky(new Date())`, then fetch the spec's Open-Meteo URL with an `AbortController` (abort on unmount and after 6 s) and set `toSkyState(json, new Date()) ?? fallback`. First caption span shows `caption(sky) ?? "sky.raw / 1-bit / " + handle`. The Japanese span is unchanged.

- [ ] **Step 2: `DitherSky.tsx` takes `sky`**

Keep the effect mounted once; hold the latest `sky` in a ref the draw loop reads. Changes inside `draw`:
- Cloud cover: add `(sky.cloud - 0.5) * 0.5` to `v` before thresholding.
- Stars: at night draw all four `STARS`; by day draw only `STARS[1]` (the sun).
- Moon, night only: disc centred at `(0.5 * W, 0.27 * H)`, radius `0.11 * H`. For a pixel inside the disc with normalised `nx, ny` in -1..1 and `k = Math.cos(2 * Math.PI * sky.moon)`, `edge = Math.sqrt(1 - ny * ny)`; it is lit when `sky.moon <= 0.5 ? nx > k * edge : nx < -k * edge`. Lit pixels are `PALE`, unlit `DARK`; draw before the stars.
- Rain, when `sky.rain > 0`: a pixel is a streak when `((x + y * 0.5 + t * 90) | 0) % (sky.rain === 2 ? 9 : 17) === 0` and `((y * 3 + x + ((t * 60) | 0)) & 7) < 3`; streak pixels are `PALE`. With reduced motion `t` is 0, so the rain is drawn still.

- [ ] **Step 3: Use `<SkyBanner handle={resume.handle} />` in `page.tsx`** and drop the now-unused `DitherSky` import there.

- [ ] **Step 4: Verify in the browser**

Start `resume-dev`. Check each state by temporarily hard-coding the `SkyState` in `SkyBanner` (revert afterwards): clear night at full moon, overcast day, heavy rain at night, new moon. Check both themes, 375px width, and with the network request blocked (caption stays `sky.raw / 1-bit / null.rot`, no console error). Screenshot the real state.

- [ ] **Step 5: Commit and ship phase 1**

```bash
git add src/components/SkyBanner.tsx src/components/DitherSky.tsx src/app/page.tsx src/app/globals.css
git commit -m "Drive the banner sky from Davao's real weather and moon"
git push origin main
```

After Vercel redeploys, load https://amorcillo.vercel.app and confirm the caption shows live data.

---

# Phase 2: Secrets and terminal

### Task 4: Secret store, toast and footer counter

**Files:**
- Create: `src/lib/secrets.ts`, `src/lib/secrets.test.ts`, `src/components/SecretCount.tsx`, `src/components/Secrets.tsx`
- Modify: `src/app/page.tsx` (footer), `src/app/layout.tsx` (mount `<Secrets />`), `src/app/globals.css`

**Interfaces:**
- Produces:
  - `const SECRET_IDS = ["terminal", "bark", "sudo", "konami", "bite", "console"] as const`; `type SecretId = (typeof SECRET_IDS)[number]`
  - `parseSecrets(raw: string | null): SecretId[]`
  - `addSecret(list: SecretId[], id: SecretId): SecretId[]` (same array back if already present)
  - `foundSecrets(): SecretId[]` (reads `localStorage["secrets"]`)
  - `findSecret(id: SecretId): boolean` (true only when newly found; saves and dispatches `rot:secret` with `detail: { id, count }`)
  - `useSecrets(): SecretId[]` (`useSyncExternalStore`, server snapshot `[]`)

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/secrets.test.ts
import { expect, it } from "vitest";
import { SECRET_IDS, addSecret, parseSecrets } from "./secrets";

it("has six secrets", () => expect(SECRET_IDS).toHaveLength(6));

it("parses stored secrets defensively", () => {
  expect(parseSecrets(null)).toEqual([]);
  expect(parseSecrets("not json")).toEqual([]);
  expect(parseSecrets('{"a":1}')).toEqual([]);
  expect(parseSecrets('["konami","nope",3,"konami","bite"]')).toEqual(["konami", "bite"]);
});

it("adds a secret once", () => {
  const one = addSecret([], "bark");
  expect(one).toEqual(["bark"]);
  expect(addSecret(one, "bark")).toBe(one);
});
```

- [ ] **Step 2: Run it** — `npx vitest run src/lib/secrets.test.ts`, Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/secrets.ts`**

`useSecrets` must return a stable array reference between changes (cache the parsed list, refresh it on `rot:secret` and `storage` events).

- [ ] **Step 4: `SecretCount.tsx` and footer**

Client component for the footer: a `>_ terminal` button that dispatches `rot:terminal`, and the line `secrets found {n}/6`, or `all 6 found. good dog.` at six. Add it to the `<footer>` in `page.tsx` above the copyright line.

- [ ] **Step 5: `Secrets.tsx` with the toast**

Client component mounted in `layout.tsx` beside `<StarTrail />`. For now it only listens for `rot:secret` and shows a toast `secret found {count}/6: {id}` for 3 s (`role="status"`, fixed bottom centre, pixel font, above the player). Later tasks add the triggers here.

- [ ] **Step 6: Verify and commit**

Run tests and build. In the browser console run `window.dispatchEvent(new CustomEvent("rot:secret", { detail: { id: "bark", count: 1 } }))` and confirm the toast; confirm the footer reads `secrets found 0/6`.

```bash
git add src/lib/secrets.ts src/lib/secrets.test.ts src/components/SecretCount.tsx src/components/Secrets.tsx src/app/page.tsx src/app/layout.tsx src/app/globals.css
git commit -m "Add the secret store, toast and footer counter"
```

### Task 5: Terminal command interpreter

**Files:**
- Create: `src/lib/terminal.ts`, `src/lib/terminal.test.ts`

**Interfaces:**
- Consumes: `resume` from `@/content/resume`, `SecretId`.
- Produces:
  - `type Effect = { type: "theme"; value: "dark" | "light" } | { type: "radio"; action: "play" | "pause" | "next" } | { type: "bark" } | { type: "play" } | { type: "clear" } | { type: "close" } | { type: "secret"; id: SecretId }`
  - `type Ctx = { found: number; sky: string | null }`
  - `run(input: string, ctx: Ctx): { lines: string[]; effects: Effect[] }`
  - `const MAX_INPUT = 200`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/terminal.test.ts
import { describe, expect, it } from "vitest";
import { run } from "./terminal";

const ctx = { found: 2, sky: "davao / 25.8°C / overcast" };

describe("terminal", () => {
  it("lists commands in help but hides bark and sudo", () => {
    const text = run("help", ctx).lines.join("\n");
    for (const c of ["whoami", "stack", "project", "contact", "weather", "theme", "radio", "play", "secrets", "clear", "exit"])
      expect(text).toContain(c);
    expect(text).not.toContain("bark");
    expect(text).not.toContain("sudo");
  });
  it("answers the content commands from resume.ts", () => {
    expect(run("whoami", ctx).lines.join("\n")).toContain("Evander");
    expect(run("stack", ctx).lines.join("\n")).toContain("PowerShell");
    expect(run("project", ctx).lines.join("\n")).toContain("MobileOps Connect");
    expect(run("contact", ctx).lines.join("\n")).toContain("github.com/TaNoir");
  });
  it("is case-insensitive and trims", () => {
    expect(run("  HELP  ", ctx).lines).toEqual(run("help", ctx).lines);
  });
  it("drives the theme and radio", () => {
    expect(run("theme light", ctx).effects).toEqual([{ type: "theme", value: "light" }]);
    expect(run("theme purple", ctx).effects).toEqual([]);
    expect(run("theme purple", ctx).lines).toEqual(["usage: theme dark|light"]);
    expect(run("radio next", ctx).effects).toEqual([{ type: "radio", action: "next" }]);
    expect(run("radio", ctx).lines).toEqual(["usage: radio play|pause|next"]);
  });
  it("reports weather and secrets from context", () => {
    expect(run("weather", ctx).lines).toEqual(["davao / 25.8°C / overcast"]);
    expect(run("weather", { found: 0, sky: null }).lines).toEqual(["no signal from the sky."]);
    expect(run("secrets", ctx).lines).toEqual(["2/6 found. keep digging."]);
  });
  it("has hidden commands that are secrets", () => {
    expect(run("bark", ctx).effects).toEqual([{ type: "bark" }, { type: "secret", id: "bark" }]);
    const sudo = run("sudo rm -rf /", ctx);
    expect(sudo.lines).toEqual(["nice try. this incident will be reported to the dog."]);
    expect(sudo.effects).toEqual([{ type: "secret", id: "sudo" }]);
  });
  it("handles play, clear and exit", () => {
    expect(run("play", ctx).effects).toEqual([{ type: "play" }, { type: "close" }]);
    expect(run("clear", ctx).effects).toEqual([{ type: "clear" }]);
    expect(run("exit", ctx).effects).toEqual([{ type: "close" }]);
  });
  it("survives odd input", () => {
    expect(run("", ctx)).toEqual({ lines: [], effects: [] });
    expect(run("    ", ctx)).toEqual({ lines: [], effects: [] });
    expect(run("<img src=x onerror=alert(1)>", ctx).lines).toEqual(["command not found: <img"]);
    const long = run("x".repeat(5000), ctx).lines[0];
    expect(long.length).toBeLessThanOrEqual("command not found: ".length + 200);
  });
});
```

- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement `run`** — truncate input to `MAX_INPUT` first, split on whitespace, lowercase the first word only.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/lib/terminal.ts src/lib/terminal.test.ts
git commit -m "Add the terminal command interpreter"
```

### Task 6: Terminal window and its wiring

**Files:**
- Create: `src/lib/theme.ts`, `src/components/Terminal.tsx`
- Modify: `src/components/ThemeToggle.tsx` (use `setTheme`), `src/components/RotPlayer.tsx` (listen for `rot:radio`), `src/components/SkyBanner.tsx` (publish the caption), `src/app/layout.tsx` (mount `<Terminal />`), `src/app/globals.css`

**Interfaces:**
- Consumes: `run`, `Effect`, `MAX_INPUT`; `findSecret`, `useSecrets`.
- Produces: `setTheme(theme: "dark" | "light"): void` in `src/lib/theme.ts` (the existing `apply` logic, including the view-transition tear and the `localStorage` write, moved out of `ThemeToggle`; it must also notify `ThemeToggle`'s existing external store so the toggle icon follows). `SkyBanner` sets `document.documentElement.dataset.sky` to the caption text when it has live data.

- [ ] **Step 1: Move theme switching into `src/lib/theme.ts`** and have `ThemeToggle` call it. Verify the toggle still works and still tears.

- [ ] **Step 2: `RotPlayer` listens for `rot:radio`** and calls its existing play/pause/skip paths. `"play"` when already playing and `"pause"` when already paused do nothing. It must never fire on load.

- [ ] **Step 3: Build `Terminal.tsx`**

A native `<dialog>` (opened with `showModal()` so focus is trapped and Esc closes it). Opens on `rot:terminal`, or on the backtick key when the event target is not an `input`, `textarea` or contenteditable. Contents: a title bar `null.rot — /bin/sh` with a close button, a scrolling log (`aria-live="polite"`), and one text input with `maxLength={MAX_INPUT}`, `autoCapitalize="off"`, `autoCorrect="off"`, `spellCheck={false}`. First open prints `type 'help'.` and calls `findSecret("terminal")`. Enter echoes `> {input}`, calls `run(input, { found: secrets.length, sky: document.documentElement.dataset.sky ?? null })`, appends the lines, then applies effects: `theme` → `setTheme`; `radio`, `bark`, `play` → dispatch `rot:radio` / `rot:bark` / `rot:play`; `secret` → `findSecret`; `clear` → empty the log; `close` → close. Up/Down arrows recall earlier inputs. Keep at most 200 log lines. Width `min(34rem, 100vw - 24px)`; styled like the existing `.panel`, pixel font.

- [ ] **Step 4: Verify in the browser**

Backtick opens it; `help`, `stack`, `theme light`, `radio play`, `radio next`, `weather`, `sudo ls`, `clear`, `exit` all behave; typing a backtick inside the input types a backtick; the footer button opens it at 375px with the input still visible; pasting `<b>hi</b>` prints text; focus returns to the page on close; both themes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts src/components/Terminal.tsx src/components/ThemeToggle.tsx src/components/RotPlayer.tsx src/components/SkyBanner.tsx src/app/layout.tsx src/app/globals.css
git commit -m "Add a terminal that drives the theme and radio"
```

### Task 7: Konami, bite, bark, console note and the secret track

**Files:**
- Create: `src/lib/konami.ts`, `src/lib/konami.test.ts`
- Modify: `src/components/Secrets.tsx`, `src/components/RotPlayer.tsx`, `src/app/page.tsx` (only if the avatar needs a hook attribute), `src/app/globals.css`

**Interfaces:**
- Consumes: `findSecret`, `useSecrets`; event `rot:bark`.
- Produces: `konamiStep(progress: number, key: string): number` (next progress; `10` means complete).

- [ ] **Step 1: Failing test for the key sequence**

```ts
// src/lib/konami.test.ts
import { expect, it } from "vitest";
import { konamiStep } from "./konami";

const CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const feed = (keys: string[]) => keys.reduce(konamiStep, 0);

it("completes on the full code", () => expect(feed(CODE)).toBe(10));
it("accepts capital B and A", () => expect(feed([...CODE.slice(0, 8), "B", "A"])).toBe(10));
it("resets on a wrong key", () => expect(feed(["ArrowUp", "ArrowUp", "x"])).toBe(0));
it("keeps a run of three ups alive", () => expect(feed(["ArrowUp", "ArrowUp", "ArrowUp", "ArrowDown"])).toBe(3));
```

- [ ] **Step 2: Run (FAIL), implement `konamiStep`, run (PASS).**

- [ ] **Step 3: Add the triggers to `Secrets.tsx`**

- Konami: `keydown` listener, ignored while an `input` has focus. On completion set `document.documentElement.dataset.rot = ""` for 4000 ms and `findSecret("konami")`.
- Bite: `click` listener on `.avatar` (it needs `pointer-events: auto`; it stays `aria-hidden`). Five clicks within 2000 ms → add class `dog-bite` to `.dog` for 700 ms with CSS variables `--bx`/`--by` pointing 40% of the way to the pointer, and `findSecret("bite")`.
- Bark: on `rot:bark` add class `dog-bark` to `.dog` for 1300 ms (reuse the existing hover bark keyframes).
- Console note: once on mount, `console.log("%c null.rot %c you opened the hood. call rot() to claim a secret.", <pale-on-ink badge style>, "")`, and define `window.rot = () => (findSecret("console") ? "claimed." : "already yours.")`.

- [ ] **Step 4: Rot mode CSS**

`:root[data-rot]`: `.page` gets a stepped shake and hue/invert flicker, the banner tears harder, and the `body::after` grain strengthens. Under `prefers-reduced-motion: reduce`: `filter: invert(1)` only, no movement.

- [ ] **Step 5: Secret track in `RotPlayer`**

Add a fourth `Track` named `bad_sector.wav`, `bpm: 96`, in the same shape as the existing three. `skip` passes over it while `useSecrets().length === 0`. Finding the first secret changes nothing on screen until the visitor presses skip.

- [ ] **Step 6: Verify in the browser**

Konami triggers rot mode and a toast; five fast clicks on the dog make it lunge; `bark` in the terminal barks; `rot()` in the console claims; after any secret, pressing skip reaches `bad_sector.wav`; the footer reaches `all 6 found. good dog.`; reload keeps the count; with storage blocked nothing throws. Check reduced motion, both themes, 375px.

- [ ] **Step 7: Commit and ship phase 2**

```bash
git add src/lib/konami.ts src/lib/konami.test.ts src/components/Secrets.tsx src/components/RotPlayer.tsx src/app/page.tsx src/app/globals.css
git commit -m "Add the Konami rot mode, dog bite, console note and secret track"
git push origin main
```

---

# Phase 3: Dog on the roof

### Task 8: Game engine

**Files:**
- Create: `src/lib/runner.ts`, `src/lib/runner.test.ts`

**Interfaces:**
- Produces:
  - Constants: `VIEW_W = 320`, `VIEW_H = 120`, `ROOF_Y = 96`, `DOG_X = 48`, `DOG_W = 18`, `DOG_H = 16`, `GRAVITY = 900`, `JUMP_V = 300`, `SPEED_START = 90`, `SPEED_GAIN = 4`, `SPEED_MAX = 220`, `MAX_STEP_MS = 50`, `CHIMNEY_W = 8`, `CHIMNEY_H = 14`
  - `type Roof = { x: number; w: number; chimneys: number[] }` (chimney x offsets from the roof's left edge)
  - `type Game = { status: "ready" | "running" | "over"; t: number; distance: number; speed: number; dogY: number; dogVy: number; grounded: boolean; roofs: Roof[]; seed: number }`
  - `newGame(seed: number): Game` (status `"ready"`, dog standing on a first roof at least `VIEW_W` wide with no chimneys)
  - `step(game: Game, dtMs: number, jump: boolean): Game` (pure; returns a new object)
  - `score(game: Game): number` (`Math.floor(distance / 10)`)
  - `maxGap(speed: number): number` (`0.55 * speed * (2 * JUMP_V / GRAVITY)`, capped at 70)
  - `parseBest(raw: string | null): number`

`dogY` is the dog's feet, so standing is `dogY === ROOF_Y`. `step` with `jump` true starts a `"ready"` game, jumps when `"running"` and grounded, and returns a running `newGame(game.seed + 1)` when `"over"`. Falling so the feet pass `VIEW_H`, or overlapping a chimney's box, sets `"over"`. New roofs are generated ahead from a seeded generator (same LCG as `DitherSky`): gap between 28 and `maxGap(speed)`, width 90 to 220, at most one chimney per roof, placed at least 40 px from either edge.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/runner.test.ts
import { describe, expect, it } from "vitest";
import { GRAVITY, JUMP_V, MAX_STEP_MS, ROOF_Y, SPEED_MAX, SPEED_START, maxGap, newGame, parseBest, score, step } from "./runner";

const run = (g: ReturnType<typeof newGame>, ms: number, jumpAt: number[] = []) => {
  for (let t = 0; t < ms; t += 10) g = step(g, 10, jumpAt.includes(t));
  return g;
};

describe("runner", () => {
  it("waits for the first jump", () => {
    const g = step(newGame(1), 16, false);
    expect(g.status).toBe("ready");
    expect(g.distance).toBe(0);
    expect(step(g, 16, true).status).toBe("running");
  });
  it("jumps about 50px high and lands back on the roof", () => {
    let g = step(newGame(1), 10, true); // start
    g = step(g, 10, true); // jump
    let top = ROOF_Y;
    for (let i = 0; i < 80; i++) {
      g = step(g, 10, false);
      top = Math.min(top, g.dogY);
    }
    expect(ROOF_Y - top).toBeGreaterThan(44);
    expect(ROOF_Y - top).toBeLessThan((JUMP_V * JUMP_V) / (2 * GRAVITY) + 2);
    expect(g.dogY).toBe(ROOF_Y);
    expect(g.grounded).toBe(true);
  });
  it("cannot double jump", () => {
    let g = step(step(newGame(1), 10, true), 10, true);
    const vy = step(g, 10, false).dogVy;
    g = step(g, 10, true);
    expect(g.dogVy).toBeCloseTo(vy, 5);
  });
  it("speeds up to a cap and scores distance / 10", () => {
    let g = step(newGame(1), 10, true);
    expect(g.speed).toBe(SPEED_START);
    g = { ...g, roofs: [{ x: -100, w: 1e6, chimneys: [] }] }; // endless roof
    g = run(g, 60_000);
    expect(g.speed).toBe(SPEED_MAX);
    expect(score(g)).toBe(Math.floor(g.distance / 10));
  });
  it("ends when the dog never jumps, and restarts on jump", () => {
    const g = run(step(newGame(7), 10, true), 30_000);
    expect(g.status).toBe("over");
    const again = step(g, 10, true);
    expect(again.status).toBe("running");
    expect(again.distance).toBe(0);
  });
  it("only makes gaps the dog can clear", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      let g = step(newGame(seed), 10, true);
      for (let i = 0; i < 3000; i++) {
        g = { ...step(g, 10, false), status: "running", dogY: ROOF_Y, dogVy: 0, grounded: true }; // ghost dog
        for (let r = 1; r < g.roofs.length; r++) {
          const gap = g.roofs[r].x - (g.roofs[r - 1].x + g.roofs[r - 1].w);
          expect(gap).toBeGreaterThanOrEqual(28);
          expect(gap).toBeLessThanOrEqual(70);
        }
      }
    }
    expect(maxGap(SPEED_START)).toBeCloseTo(33, 0);
    expect(maxGap(SPEED_MAX)).toBe(70);
  });
  it("never advances more than 50ms in one step", () => {
    const g = step(newGame(1), 10, true);
    expect(step(g, 5000, false).distance).toBeCloseTo(step(g, MAX_STEP_MS, false).distance, 5);
  });
  it("is deterministic for a seed", () => {
    expect(run(step(newGame(3), 10, true), 4000, [500, 1500])).toEqual(run(step(newGame(3), 10, true), 4000, [500, 1500]));
  });
  it("parses the stored best score", () => {
    expect(parseBest(null)).toBe(0);
    expect(parseBest("abc")).toBe(0);
    expect(parseBest("-5")).toBe(0);
    expect(parseBest("412")).toBe(412);
  });
});
```

- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement `src/lib/runner.ts`.** Integrate inside `step` in sub-steps of at most 1/120 s so collisions do not depend on frame rate.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/lib/runner.ts src/lib/runner.test.ts
git commit -m "Add the dog runner game engine"
```

### Task 9: Game window and entry points

**Files:**
- Create: `src/components/DogRunner.tsx`
- Modify: `src/components/SkyBanner.tsx` (add the `▶ play` button), `src/app/layout.tsx` (mount `<DogRunner />`), `src/app/globals.css`

**Interfaces:**
- Consumes: everything exported by `src/lib/runner.ts`; the `rot:play` event.

- [ ] **Step 1: Build `DogRunner.tsx`**

A native `<dialog>` opened with `showModal()` on `rot:play`. Contents: title `dog_on_the_roof.exe`, a close button, a `<canvas width={320} height={120}>` with `image-rendering: pixelated` scaled to `min(40rem, 100vw - 24px)` wide, and a hint line `space / tap to jump · esc to quit`.

- Loop: `requestAnimationFrame`, `game = step(game, now - last, jumpQueued)`; cancel on close and while `document.hidden`; reset `last` on resume.
- Input: `keydown` Space or ArrowUp (call `preventDefault` so the page does not scroll), `pointerdown` on the canvas. Each sets `jumpQueued` for exactly one step.
- Sprite: on first open, draw `/dog.png` into an 18x16 offscreen canvas and threshold alpha > 128 to a 1-bit mask; if the image fails, draw a filled 18x16 block.
- Drawing each frame, three tones read from the theme as in `DitherSky` (`NIGHT`/`PAPER`): ground-tone background, a few four-point stars, roofs as pale blocks with a mid-tone dither underside, chimneys pale, dog pale. Top row in pixel font: `SCORE 0412` left, `BEST 0980` right.
- States: `"ready"` shows `press space or tap`; `"over"` shows `GAME OVER` and the score, and writes a new best to `localStorage["runner-best"]`.
- On game over, shake the canvas for 200 ms unless reduced motion is on.

- [ ] **Step 2: Add the entry point**

In `SkyBanner`, a small `▶ play` button absolutely placed in the banner's bottom-right corner (pixel font, `.panel`-style border, at least 44x32 px tap target) dispatching `rot:play`. It must not cover the vertical Japanese caption.

- [ ] **Step 3: Verify in the browser**

Play a run with the keyboard and one with tap at 375px. Check: Space does not scroll the page; the game pauses when the tab is hidden and resumes without a jump in position; best score survives a reload; Esc and the close button stop the loop; `play` in the terminal closes the terminal and opens the game; both themes; storage blocked. Screenshot a run.

- [ ] **Step 4: Commit and ship phase 3**

```bash
git add src/components/DogRunner.tsx src/components/SkyBanner.tsx src/app/layout.tsx src/app/globals.css
git commit -m "Add the dog on the roof runner game"
git push origin main
```

After Vercel redeploys, play one run on https://amorcillo.vercel.app at phone width.
