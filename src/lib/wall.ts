import { ago } from "@/lib/ago";

/** The shared wall is 32 by 8 one-bit pixels, row by row. */
export const COLS = 32;
export const ROWS = 8;
export const CELLS = COLS * ROWS;
export const BLANK = "0".repeat(CELLS);

/** A stored wall as exactly 256 zeros and ones, whatever was stored. */
export function parseCells(raw: unknown): string {
  if (typeof raw !== "string") return BLANK;
  return raw.slice(0, CELLS).replace(/[^1]/g, "0").padEnd(CELLS, "0");
}

/** The cell under a point given as fractions of the wall's width and height. */
export function cellAt(fx: number, fy: number): number | null {
  if (!(fx >= 0 && fx < 1 && fy >= 0 && fy < 1)) return null;
  return Math.floor(fy * ROWS) * COLS + Math.floor(fx * COLS);
}

/**
 * The cells a drag passes through from `a` to `b`, not counting `a`, so a
 * fast stroke leaves no gaps (Bresenham's line).
 */
export function cellsBetween(a: number, b: number): number[] {
  let x = a % COLS;
  let y = Math.floor(a / COLS);
  const x1 = b % COLS;
  const y1 = Math.floor(b / COLS);
  const dx = Math.abs(x1 - x);
  const dy = -Math.abs(y1 - y);
  const sx = x < x1 ? 1 : -1;
  const sy = y < y1 ? 1 : -1;
  let err = dx + dy;
  const out: number[] = [];
  while (x !== x1 || y !== y1) {
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
    out.push(y * COLS + x);
  }
  return out;
}

/** One cell flip from a request body, or null if it isn't one. */
export function parseFlip(body: unknown): { i: number; on: boolean } | null {
  if (!body || typeof body !== "object") return null;
  const { i, on } = body as { i?: unknown; on?: unknown };
  if (typeof i !== "number" || !Number.isInteger(i) || i < 0 || i >= CELLS) return null;
  if (typeof on !== "boolean") return null;
  return { i, on };
}

export function setCell(cells: string, i: number, on: boolean): string {
  return cells.slice(0, i) + (on ? "1" : "0") + cells.slice(i + 1);
}

/**
 * Who a flip counts against for the rate limit. IPv6 users usually hold a
 * whole /64 and can switch addresses at will, so they are grouped by it.
 */
export function rateBucket(ip: string): string {
  const v4 = ip.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4) return v4[1];
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const front = head ? head.split(":") : [];
  const back = tail ? tail.split(":") : [];
  const groups = ip.includes("::")
    ? [...front, ...Array(Math.max(0, 8 - front.length - back.length)).fill("0"), ...back]
    : front;
  return groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":");
}

/** A fresh copy of the wall with this visitor's unsent flips laid over it. */
export function withPending(cells: string, pending: Map<number, boolean>): string {
  let out = cells;
  for (const [i, on] of pending) out = setCell(out, i, on);
  return out;
}

const VISIT_TTL_MS = 30 * 60_000;

/**
 * The last-visit answer saved by an earlier tab in the past half hour, so
 * opening another tab doesn't record this visitor again and show them
 * their own visit. Null when there is none.
 */
export function cachedVisit(raw: string | null, now: number): { last: unknown } | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as { last?: unknown; at?: unknown };
    if (typeof saved.at !== "number" || now - saved.at > VISIT_TTL_MS || !("last" in saved)) return null;
    return { last: saved.last };
  } catch {
    return null;
  }
}

/**
 * What the owner sees after pressing "clear the wall", from the server's
 * status (null when the request never arrived). `forget` drops a saved
 * token that turned out wrong.
 */
export function wipeResult(status: number | null): { text: string; forget: boolean } {
  if (status === 204) return { text: "Wall cleared.", forget: false };
  if (status === 401) return { text: "That token doesn't match the one in Vercel.", forget: true };
  if (status === 503) return { text: "The wall is offline right now.", forget: false };
  if (status === null) return { text: "Couldn't reach the site. Check your connection.", forget: false };
  return { text: `Something went wrong (${status}).`, forget: false };
}

/** Where the last visitor came from. Nothing that identifies them. */
export type Visit = { city: string; country: string; at: string };

export function parseVisit(raw: unknown): Visit | null {
  if (!raw || typeof raw !== "object") return null;
  const { city, country, at } = raw as Record<string, unknown>;
  if (typeof city !== "string" || typeof country !== "string" || typeof at !== "string") return null;
  if (!city.trim() || !country.trim() || Number.isNaN(Date.parse(at))) return null;
  return { city: city.trim().slice(0, 40), country: country.trim().slice(0, 2).toUpperCase(), at };
}

export function visitLine(v: Visit, now: Date): string {
  return `last visit from ${v.city}, ${v.country} · ${ago(v.at, now)}`;
}
