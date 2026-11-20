import { geolocation } from "@vercel/functions";
import { lastVisit, redis, swapVisit } from "@/lib/store";
import { parseVisit } from "@/lib/wall";

const NO_STORE = { "Cache-Control": "no-store" };

const decode = (s: string | undefined) => {
  try {
    return s ? decodeURIComponent(s) : "";
  } catch {
    return s ?? "";
  }
};

/**
 * Records where this visitor is roughly from (city and country only, from
 * Vercel's geolocation) and answers with the visitor before them.
 */
export async function POST(request: Request) {
  const db = redis();
  if (!db) return Response.json({ error: "offline" }, { status: 503, headers: NO_STORE });
  try {
    const geo = geolocation(request);
    const visit = parseVisit({ city: decode(geo.city), country: geo.country ?? "", at: new Date().toISOString() });
    const last = visit ? await swapVisit(db, visit) : await lastVisit(db);
    return Response.json({ last }, { headers: NO_STORE });
  } catch {
    return Response.json({ error: "offline" }, { status: 503, headers: NO_STORE });
  }
}
