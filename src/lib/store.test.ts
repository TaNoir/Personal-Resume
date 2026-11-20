import type { Redis } from "@upstash/redis";
import { describe, expect, it } from "vitest";
import { allowFlip } from "./store";

/** Just enough of Redis for the flip counters: INCR, EXPIRE and MULTI. */
function fakeRedis() {
  const values = new Map<string, number>();
  const timers = new Map<string, number>();
  const incr = (key: string) => {
    const n = (values.get(key) ?? 0) + 1;
    values.set(key, n);
    return n;
  };
  const expire = (key: string, seconds: number, option?: string) => {
    if (option?.toUpperCase() === "NX" && timers.has(key)) return 0;
    timers.set(key, seconds);
    return 1;
  };
  const db = {
    incr: async (key: string) => incr(key),
    expire: async (key: string, seconds: number, option?: string) => expire(key, seconds, option),
    multi() {
      const queued: (() => number)[] = [];
      const tx = {
        incr: (key: string) => (queued.push(() => incr(key)), tx),
        expire: (key: string, seconds: number, option?: string) => (queued.push(() => expire(key, seconds, option)), tx),
        exec: async () => queued.map((run) => run()),
      };
      return tx;
    },
  };
  return { db: db as unknown as Redis, values, timers };
}

describe("flip limits", () => {
  it("lets a visitor flip and starts a one-minute window", async () => {
    const { db, timers } = fakeRedis();
    expect(await allowFlip(db, "203.0.113.7")).toBe(true);
    expect(timers.get("rl:all")).toBe(60);
  });

  it("gives a counter that lost its timer a new one, so the wall can't lock up for good", async () => {
    // A request cut off between counting and setting the timer leaves a
    // count that never resets. The next flip has to repair it.
    const { db, values, timers } = fakeRedis();
    values.set("rl:all", 5);
    await allowFlip(db, "203.0.113.7");
    expect(timers.get("rl:all")).toBe(60);
  });

  it("doesn't push back a window that is already running", async () => {
    const { db, values, timers } = fakeRedis();
    values.set("rl:all", 3);
    timers.set("rl:all", 12);
    await allowFlip(db, "203.0.113.7");
    expect(timers.get("rl:all")).toBe(12);
  });

  it("turns a visitor away after 60 flips in a minute", async () => {
    const { db } = fakeRedis();
    for (let i = 0; i < 60; i++) expect(await allowFlip(db, "203.0.113.7")).toBe(true);
    expect(await allowFlip(db, "203.0.113.7")).toBe(false);
    expect(await allowFlip(db, "198.51.100.2")).toBe(true);
  });
});
