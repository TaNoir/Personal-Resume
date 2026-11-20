import { ipAddress } from "@vercel/functions";
import { connection } from "next/server";
import { allowFlip, flipCell, readWall, redis, wipeWall } from "@/lib/store";
import { parseFlip } from "@/lib/wall";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });
const offline = () => json({ error: "offline" }, 503);

/** The shared pixel wall, as 256 zeros and ones. */
export async function GET() {
  await connection();
  const db = redis();
  if (!db) return offline();
  try {
    return json({ cells: await readWall(db) });
  } catch {
    return offline();
  }
}

/** Flips one cell: `{ i, on }`. */
export async function POST(request: Request) {
  const flip = parseFlip(await request.json().catch(() => null));
  if (!flip) return json({ error: "bad request" }, 400);
  const db = redis();
  if (!db) return offline();
  try {
    if (!(await allowFlip(db, ipAddress(request) ?? "unknown"))) return json({ error: "slow down" }, 429);
    return json({ cells: await flipCell(db, flip.i, flip.on) });
  } catch {
    return offline();
  }
}

/** Wipes the wall. Only with the owner's token, which lives in Vercel. */
export async function DELETE(request: Request) {
  const token = process.env.WALL_ADMIN_TOKEN;
  if (!token || request.headers.get("x-wall-token") !== token) return json({ error: "unauthorized" }, 401);
  const db = redis();
  if (!db) return offline();
  try {
    await wipeWall(db);
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch {
    return offline();
  }
}
