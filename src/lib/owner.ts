import { createHash, timingSafeEqual } from "node:crypto";

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * Whether a request carries the owner's token (header `x-wall-token`).
 * Compared in constant time; false when no token is configured.
 */
export function isOwner(request: Request): boolean {
  const token = process.env.WALL_ADMIN_TOKEN;
  const given = request.headers.get("x-wall-token");
  if (!token || !given) return false;
  return timingSafeEqual(digest(token), digest(given));
}
