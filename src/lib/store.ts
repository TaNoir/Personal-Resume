import { Redis } from "@upstash/redis";
import { BLANK, CELLS, parseCells, parseVisit, type Visit } from "@/lib/wall";

const WALL = "wall";
const VISIT = "visit";
const FLIPS_PER_MINUTE = 60;

let client: Redis | null | undefined;

/**
 * The Redis store behind the pixel wall, or null when it isn't set up (for
 * example in local development), so callers can answer "offline" instead
 * of failing. Reads Vercel's names first, then Upstash's own.
 */
export function redis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  // Values come back as stored: a wall of all ones must stay a string, not
  // be read as a number.
  client = url && token ? new Redis({ url, token, automaticDeserialization: false }) : null;
  return client;
}

export async function readWall(db: Redis): Promise<string> {
  return parseCells(await db.get<string>(WALL));
}

/** Flips one cell in place, so people drawing at once never undo each other. */
export async function flipCell(db: Redis, i: number, on: boolean): Promise<string> {
  await db.set(WALL, BLANK, { nx: true });
  await db.setrange(WALL, Math.min(Math.max(i, 0), CELLS - 1), on ? "1" : "0");
  return readWall(db);
}

export async function wipeWall(db: Redis): Promise<void> {
  await db.set(WALL, BLANK);
}

/** At most 60 flips a minute per visitor, keyed by a hash of their address. */
export async function allowFlip(db: Redis, ip: string): Promise<boolean> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  const id = [...new Uint8Array(digest).slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const key = `rl:${id}`;
  const count = await db.incr(key);
  if (count === 1) await db.expire(key, 60);
  return count <= FLIPS_PER_MINUTE;
}

export async function lastVisit(db: Redis): Promise<Visit | null> {
  const raw = await db.get<string>(VISIT);
  if (!raw) return null;
  try {
    return parseVisit(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Records this visit and returns the one before it. */
export async function swapVisit(db: Redis, visit: Visit): Promise<Visit | null> {
  const before = await lastVisit(db);
  await db.set(VISIT, JSON.stringify(visit));
  return before;
}
