"use client";

import { useSyncExternalStore } from "react";
import { ago } from "@/lib/ago";

const MINUTE = 60_000;

// The current minute, so the text refreshes once a minute and React gets the
// same value back on every read in between.
const subscribe = (tick: () => void) => {
  const id = setInterval(tick, MINUTE);
  return () => clearInterval(id);
};
const minute = () => Math.floor(Date.now() / MINUTE);
const none = () => null;

/**
 * "last push 3h ago". The page is cached on the server, so the time is only
 * worked out in the browser; nothing renders until then.
 */
export default function Ago({ iso }: { iso: string }) {
  const now = useSyncExternalStore(subscribe, minute, none);
  if (now === null) return null;
  const text = ago(iso, new Date(now * MINUTE));
  if (!text) return null;
  return <span className="ago">last push {text}</span>;
}
