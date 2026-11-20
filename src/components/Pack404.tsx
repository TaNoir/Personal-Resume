"use client";

import { useEffect, useRef } from "react";
import { assignSlots, freeSpot, glyphSlots, keepOut, mergeBoxes, steer, type Box, type Point } from "@/lib/pack";
import { subscribeTheme } from "@/lib/theme";

// 9 by 6 one-bit sprites facing right: body rows, then legs. The first
// column is the tail, drawn separately so it can wag.
const BODY = {
  dog: ["......X..", "......XX.", ".....XXXX", ".XXXXXX..", ".XXXXXX.."],
  cat: [".....X.X.", ".....XXX.", ".....XXX.", "..XXXXX..", ".XXXXXX.."],
};
const LEGS = { walkA: ".X.X..X.X", walkB: "..X.X.X.X", sit: ".XX...XX." };
const TAIL = {
  dog: [[[2, 0]], [[1, 0]]],
  cat: [
    [[2, 0], [3, 0]],
    [[1, 0], [2, 0]],
  ],
} as const;

const W = 9;
const H = 6;
const EXTRAS = 8;
const GATHER_AFTER_S = 1.2;

type Kind = "dog" | "cat";
type Animal = Point & {
  kind: Kind;
  blue: boolean;
  facing: 1 | -1;
  slot: number;
  roam: Point;
  speed: number;
  gait: number;
  moving: boolean;
  wagUntil: number;
};

const tone = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * The 404 page's crowd: a pack of tiny one-bit dogs and cats that wander in,
 * line up to spell 404 where `[data-pack-anchor]` sits, scatter when the
 * pointer gets close and trot back. With reduced motion they just sit in
 * place.
 */
export default function Pack404() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const slots = glyphSlots("404");

    let colors = { pale: tone("--pale"), blue: tone("--blue") };
    let px = 3;
    let vw = 0;
    let vh = 0;

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      vw = window.innerWidth;
      vh = window.innerHeight;
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Pixel size per screen width; .pack-anchor's heights match these.
      px = vw < 640 ? 2 : vw < 1024 ? 3 : 4;
    };
    fit();

    // Where each letter spot is right now, from the anchor's place on screen.
    const spots = (): Point[] => {
      const anchor = document.querySelector("[data-pack-anchor]")?.getBoundingClientRect();
      const cw = W * px + 4;
      const ch = H * px + 4;
      const cx = anchor ? anchor.left + anchor.width / 2 : vw / 2;
      const cy = anchor ? anchor.top + anchor.height / 2 : vh / 3;
      return slots.map((s) => ({ x: cx + (s.col - 5) * cw, y: cy + (s.row - 2) * ch }));
    };

    // The page's words and button, padded by half a sprite, so strays walk
    // around them instead of across them.
    const textBoxes = (): Box[] => {
      const padX = (W * px) / 2 + 4;
      const padY = (H * px) / 2 + 4;
      const els = [...document.querySelectorAll(".lost > :not(.pack):not([data-pack-anchor])")];
      return mergeBoxes(
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left - padX, top: r.top - padY, right: r.right + padX, bottom: r.bottom + padY };
        }),
      );
    };

    const anywhere = (boxes = textBoxes()): Point =>
      freeSpot(() => ({ x: 20 + Math.random() * (vw - 40), y: 20 + Math.random() * (vh - 40) }), boxes);

    const pack: Animal[] = Array.from({ length: slots.length + EXTRAS }, (_, i) => ({
      ...anywhere(),
      kind: i % 3 === 0 ? "cat" : "dog",
      blue: i % 4 === 1,
      facing: Math.random() < 0.5 ? 1 : -1,
      slot: -1,
      roam: anywhere(),
      speed: 70 + Math.random() * 45,
      gait: Math.random(),
      moving: false,
      wagUntil: 0,
    }));
    assignSlots(pack, spots()).forEach((j, i) => (pack[i].slot = j));
    if (still) {
      const at = spots();
      for (const a of pack) if (a.slot >= 0) Object.assign(a, at[a.slot]);
    }

    let pointer: Point | null = null;
    let tapTimer: ReturnType<typeof setTimeout> | undefined;

    const sprite = (a: Animal, t: number) => {
      ctx.fillStyle = a.blue ? colors.blue : colors.pale;
      const left = Math.round(a.x - (W * px) / 2);
      const top = Math.round(a.y - (H * px) / 2);
      const dot = (col: number, row: number) => {
        const c = a.facing === 1 ? col : W - 1 - col;
        ctx.fillRect(left + c * px, top + row * px, px, px);
      };
      BODY[a.kind].forEach((line, row) => [...line].forEach((cell, col) => cell === "X" && dot(col, row)));
      const legs = a.moving ? (Math.floor(a.gait * 6) % 2 ? LEGS.walkA : LEGS.walkB) : LEGS.sit;
      [...legs].forEach((cell, col) => cell === "X" && dot(col, H - 1));
      const wag = t < a.wagUntil && Math.floor(t * 8) % 2 === 1;
      for (const [row, col] of TAIL[a.kind][wag ? 1 : 0]) dot(col, row);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, vw, vh);
      for (const a of pack) sprite(a, t);
    };

    let raf = 0;
    let last = performance.now();
    const start = last;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;
      const at = spots();
      const boxes = textBoxes();
      for (const a of pack) {
        const home = t > GATHER_AFTER_S && a.slot >= 0;
        if (!home && Math.hypot(a.roam.x - a.x, a.roam.y - a.y) < 4) a.roam = anywhere(boxes);
        const target = home ? at[a.slot] : a.roam;
        const next = steer(a, target, home ? a.speed : a.speed * 0.45, dt, pointer);
        if (!home) {
          // Bumped into the text: stay at its edge and head somewhere else.
          const out = keepOut(next, boxes);
          if (out.pushed) a.roam = anywhere(boxes);
          next.x = out.x;
          next.y = out.y;
        }
        if (Math.abs(next.x - a.x) > 0.05) a.facing = next.x > a.x ? 1 : -1;
        a.moving = next.moved;
        a.x = next.x;
        a.y = next.y;
        if (a.moving) a.gait += dt;
        else if (t > a.wagUntil + 2 && Math.random() < dt * 0.15) a.wagUntil = t + 1.2;
      }
      draw(t);
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType === "mouse") pointer = { x: e.clientX, y: e.clientY };
    };
    const tap = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      pointer = { x: e.clientX, y: e.clientY };
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => (pointer = null), 500);
    };
    const leave = () => {
      pointer = null;
    };
    const resize = () => {
      fit();
      if (still) {
        const at = spots();
        for (const a of pack) if (a.slot >= 0) Object.assign(a, at[a.slot]);
        draw(0);
      }
    };
    const unsubscribe = subscribeTheme(() => {
      colors = { pale: tone("--pale"), blue: tone("--blue") };
      draw((performance.now() - start) / 1000);
    });

    window.addEventListener("resize", resize);
    if (still) {
      draw(0);
    } else {
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerdown", tap);
      document.documentElement.addEventListener("pointerleave", leave);
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(tapTimer);
      unsubscribe();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", tap);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <canvas ref={ref} className="pack" aria-hidden="true" />;
}
