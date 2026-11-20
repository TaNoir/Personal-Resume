# Wow features: live sky, secrets, dog runner

Date: 2026-11-16. Site: https://amorcillo.vercel.app (repo TaNoir/Personal-Resume).

## Intent

Evan wants visitors to say "wow". Asked which kind of wow (something to play
with, a site that feels alive, or something hidden to find), he chose all
three. Each is built and shipped on its own, in this order: live sky,
secrets and terminal, game.

## Goals

- **Alive.** The dithered banner shows the real sky over Davao City: cloud
  cover, rain, day or night, tonight's moon phase, and a caption with the
  temperature and conditions. The GitHub panel shows how long ago Evan last
  pushed code.
- **Hidden.** Six secrets, a terminal to type commands into, and a footer
  counter (`secrets found 2/6`) so visitors know there is more to find.
- **Play.** "Dog on the roof", a 1-bit endless runner starring the doberman,
  playable with keyboard, mouse or touch, with a best score kept in the
  browser.

## Non-goals

- Spotify "now playing", a visitor counter, or anything needing a new account,
  API key, database or environment variable.
- Filler content from random APIs (quotes, facts).
- Online leaderboards.

## Anti-goals

- The resume content getting harder to read or reach. Everything here is
  optional decoration around it.
- Sound that starts by itself.
- A broken page when an API is down or the browser blocks storage.

## Constraints

- No new runtime dependencies. One new dev dependency: `vitest`, for the pure
  logic.
- Next.js 16 App Router as already set up. Read `node_modules/next/dist/docs/`
  before writing code (AGENTS.md).
- Narrow single column, cybergrunge look, three tones per theme. Must work in
  dark and light themes and at phone width.
- All motion respects `prefers-reduced-motion`.

## Approaches

**Weather data.** (a) Fetch on the server with `"use cache"`, like the GitHub
data. (b) Fetch in the visitor's browser from Open-Meteo. Picked (b): the page
is cached for an hour or more, so server data would often be stale, and day or
night must be right at the moment of the visit. Open-Meteo needs no key and
allows browser requests. Cost: one request per visit to a third party.

**Secrets storage.** (a) Browser `localStorage`. (b) A server store. Picked
(a): no account needed, and progress is personal to the visitor anyway.

**Game.** (a) Canvas runner with a pure, tested engine and a thin drawing
layer. (b) A game library. Picked (a): the game is small, a library would be
most of the page's weight, and the 1-bit look is easier drawn by hand.

**Wiring between features.** The terminal has to drive the theme, the radio,
the dog and the game. Picked plain `window` custom events (`rot:radio`,
`rot:bark`, `rot:terminal`, `rot:play`, `rot:secret`) over a shared React
context, because the pieces live in different parts of the tree (layout and
page) and each already manages its own state.

## Design

### 1. Live sky

- Source: `https://api.open-meteo.com/v1/forecast?latitude=7.07&longitude=125.61&current=temperature_2m,cloud_cover,precipitation,weather_code,is_day&timezone=Asia%2FManila`.
- `SkyState = { cloud: number (0..1), rain: 0 | 1 | 2, night: boolean, tempC: number | null, label: string, moon: number (0..1, 0 = new, 0.5 = full) }`.
- Before data arrives, or if the request fails: `cloud 0.5, rain 0`, night
  from Davao's clock (18:00 to 05:59), moon from the date, and the caption
  stays `sky.raw / 1-bit / null.rot`.
- Drawing: cloud cover shifts how much cloud passes the dither threshold.
  Rain draws slanted pale streaks (light: sparse, heavy: dense). Night shows
  the four stars and a moon disc lit according to phase. Day hides the three
  small stars and keeps the large one as the sun.
- Caption with data: `davao / 25.8°C / overcast / waxing gibbous` at night,
  without the moon name by day.
- Conditions from WMO codes: 0 clear, 1-2 partly cloudy, 3 overcast, 45/48
  fog, 51-57 drizzle, 61-67 and 80-82 rain, 95-99 thunderstorm, anything else
  cloudy. Rain level 2 for precipitation of 2.5 mm or more, codes 65, 82 and
  95-99; level 1 for any other drizzle or rain code or precipitation above 0.
- Last push: newest public GitHub event of type `PushEvent`, `CreateEvent` or
  `PullRequestEvent`, cached like the other GitHub data, shown in the GitHub
  panel's top line as `last push 3d ago`. The "ago" text is computed in the
  browser. (Builder's call: it sits in the GitHub panel, not beside the
  status pill, because that line has no room at phone width.)

### 2. Secrets and terminal

Six secrets, ids in this order:

| id | How it is found |
|---|---|
| `terminal` | Opening the terminal for the first time |
| `bark` | Typing `bark` in the terminal (not listed in `help`) |
| `sudo` | Typing `sudo` followed by anything (not listed in `help`) |
| `konami` | Up up down down left right left right B A on the keyboard |
| `bite` | Clicking the dog avatar 5 times within 2 seconds |
| `console` | Calling `rot()` in the browser console, as the console note says |

- Stored in `localStorage` under `secrets` as a JSON array of ids.
- Finding one shows a toast for 3 seconds: `secret found 3/6: konami`.
- Footer line: `secrets found 2/6`; at six, `all 6 found. good dog.`
- Terminal: opens with the backtick key or a `>_ terminal` button in the
  footer (the button is the only way in on a phone). Closes with Esc or
  `exit`. Listed commands: `help`, `whoami`, `stack`, `project`, `contact`,
  `weather`, `theme dark|light`, `radio play|pause|next`, `play`, `secrets`,
  `clear`, `exit`. Unknown input prints `command not found: <word>`. Output
  is always rendered as text, never as HTML.
- Rot mode (Konami): the whole page glitches for 4 seconds. With reduced
  motion: colours invert for 4 seconds, no shaking.
- Bite: the dog lunges toward the pointer and snaps once.
- Secret track: a fourth radio track, `bad_sector.wav` at 96 bpm, appears in
  the radio's rotation once at least one secret is found.
- Console note: one styled `console.log` on load telling developers to call
  `rot()`.

### 3. Dog on the roof

- Opens in a dialog from a `▶ play` button in the banner's top-right
  corner (the vertical name fills the bottom-right), or the terminal's `play`
  command. Esc or a close button leaves.
- 320 x 120 logical pixels, scaled up with crisp pixels, three tones from the
  current theme.
- The dog (a small 1-bit sprite made from `public/dog.png` at load) runs
  right along flat rooftops. Hazards: gaps between roofs, and chimneys on
  them. Space, Up arrow, click or tap jumps; no double jump.
- Speed starts at 90 px/s and rises 4 px/s every second to a cap of 220.
  Gravity 900 px/s², jump velocity 300 px/s upward. Gaps are always
  clearable at the current speed.
- Score is distance travelled divided by 10, rounded down. Best score is kept
  in `localStorage` under `runner-best`.
- Falling or hitting a chimney ends the run; any jump input restarts.
- Pauses when the tab is hidden. With reduced motion the game still runs
  (it is opt-in) but without screen shake.

## Left to the builder

Exact pixel art, glitch styling, toast and terminal styling, wording of
terminal output beyond what is fixed above, and the notes of the secret track.
