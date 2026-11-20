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
