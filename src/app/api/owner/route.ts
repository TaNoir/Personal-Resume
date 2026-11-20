import { isOwner } from "@/lib/owner";

/** 204 if the `x-wall-token` header is the owner's token, 401 otherwise. */
export async function POST(request: Request) {
  return new Response(null, { status: isOwner(request) ? 204 : 401, headers: { "Cache-Control": "no-store" } });
}
