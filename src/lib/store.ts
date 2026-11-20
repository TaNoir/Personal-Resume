import { Redis } from "@upstash/redis";
import { BLANK, CELLS, parseCells, rateBucket } from "@/lib/wall";

const WALL = "wall";
const FLIPS_PER_MINUTE = 60;
const FLIPS_PER_MINUTE_ALL = 600;

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

const count = async (db: Redis, key: string) => {
  const n = await db.incr(key);
  if (n === 1) await db.expire(key, 60);
  return n;
};

/**
 * At most 60 flips a minute per visitor (keyed by a hash of their address,
 * or of their IPv6 /64), and 600 a minute across everyone, so no script
 * can repaint the whole wall in seconds.
 */
export async function allowFlip(db: Redis, ip: string): Promise<boolean> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rateBucket(ip)));
  const id = [...new Uint8Array(digest).slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if ((await count(db, `rl:${id}`)) > FLIPS_PER_MINUTE) return false;
  return (await count(db, "rl:all")) <= FLIPS_PER_MINUTE_ALL;
}
