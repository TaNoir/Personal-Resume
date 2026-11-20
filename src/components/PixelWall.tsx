"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { subscribeTheme } from "@/lib/theme";
import { BLANK, CELLS, COLS, ROWS, cellAt, cellsBetween, parseCells, parseVisit, setCell, visitLine } from "@/lib/wall";

const POLL_MS = 20_000;
const VISIT_KEY = "last-visit";

const tone = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// One request per page load, even if the effect runs twice: a second
// request would record this visitor and then report them as the last one.
let visitOnce: Promise<string | null> | null = null;
const lastVisitLine = () => (visitOnce ??= fetchLastVisit());

/** Where the visitor before this one came from, asked once per session. */
async function fetchLastVisit(): Promise<string | null> {
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(VISIT_KEY);
  } catch {}
  let raw: unknown = null;
  if (stored !== null) {
    try {
      raw = JSON.parse(stored);
    } catch {}
  } else {
    const res = await fetch("/api/visit", { method: "POST" }).catch(() => null);
    if (!res?.ok) return null;
    raw = ((await res.json().catch(() => null)) as { last?: unknown } | null)?.last ?? null;
    try {
      sessionStorage.setItem(VISIT_KEY, JSON.stringify(raw));
    } catch {}
  }
  const visit = parseVisit(raw);
  return visit && visitLine(visit, new Date());
}

/**
 * A 32 by 8 wall of one-bit pixels that every visitor shares. Click, tap or
 * drag to draw; the first pixel touched decides whether the drag draws or
 * erases. Arrow keys and space work too. Changes show at once and roll back
 * if the server refuses them.
 */
export default function PixelWall() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const cells = useRef(BLANK);
  const cursor = useRef<number | null>(null);
  const drag = useRef<{ on: boolean; last: number } | null>(null);
  const redraw = useRef<() => void>(() => {});
  const [offline, setOffline] = useState(false);
  const [visit, setVisit] = useState<string | null>(null);

  // Draws the cells at the canvas's real size, so the pixels stay sharp.
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;

    const draw = () => {
      const w = el.width;
      const h = el.height;
      const cw = w / COLS;
      const ch = h / ROWS;
      const gap = Math.max(1, Math.round(cw * 0.08));
      ctx.fillStyle = tone("--bg");
      ctx.fillRect(0, 0, w, h);
      const on = tone("--pale");
      const off = tone("--line");
      for (let i = 0; i < CELLS; i++) {
        const x = Math.round((i % COLS) * cw);
        const y = Math.round(Math.floor(i / COLS) * ch);
        const x2 = Math.round(((i % COLS) + 1) * cw);
        const y2 = Math.round((Math.floor(i / COLS) + 1) * ch);
        ctx.fillStyle = cells.current[i] === "1" ? on : off;
        ctx.globalAlpha = cells.current[i] === "1" ? 1 : 0.35;
        ctx.fillRect(x, y, x2 - x - gap, y2 - y - gap);
      }
      ctx.globalAlpha = 1;
      const c = cursor.current;
      if (c !== null) {
        ctx.strokeStyle = tone("--blue");
        ctx.lineWidth = gap * 2;
        const x = Math.round((c % COLS) * cw);
        const y = Math.round(Math.floor(c / COLS) * ch);
        ctx.strokeRect(x + gap / 2, y + gap / 2, Math.round(cw) - gap * 2, Math.round(ch) - gap * 2);
      }
    };
    redraw.current = draw;

    const fit = () => {
      const r = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      el.width = Math.max(COLS, Math.round(r.width * dpr));
      el.height = Math.max(ROWS, Math.round(r.height * dpr));
      draw();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    const unsubscribe = subscribeTheme(draw);
    return () => {
      ro.disconnect();
      unsubscribe();
    };
  }, []);

  // Loads the wall when it comes into view and refreshes it while it stays there.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let gone = false;

    const load = async () => {
      if (drag.current || document.hidden) return;
      const res = await fetch("/api/wall", { cache: "no-store" }).catch(() => null);
      if (gone) return;
      if (!res?.ok) return setOffline(true);
      const body = (await res.json().catch(() => null)) as { cells?: unknown } | null;
      if (gone || drag.current) return;
      cells.current = parseCells(body?.cells);
      setOffline(false);
      redraw.current();
    };

    const io = new IntersectionObserver(([entry]) => {
      clearInterval(timer);
      if (!entry.isIntersecting) return;
      void load();
      timer = setInterval(load, POLL_MS);
    });
    io.observe(el);
    void lastVisitLine().then((line) => !gone && setVisit(line));
    return () => {
      gone = true;
      io.disconnect();
      clearInterval(timer);
    };
  }, []);

  const flip = (i: number, on: boolean) => {
    const was = cells.current[i] === "1";
    if (was === on) return;
    cells.current = setCell(cells.current, i, on);
    redraw.current();
    void fetch("/api/wall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ i, on }),
    })
      .then((res) => res.ok)
      .catch(() => false)
      .then((ok) => {
        // Refused or lost: put the pixel back, unless it has been changed since.
        if (ok || (cells.current[i] === "1") !== on) return;
        cells.current = setCell(cells.current, i, was);
        redraw.current();
      });
  };

  const cellFrom = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return cellAt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (offline || e.button !== 0) return;
    const i = cellFrom(e);
    if (i === null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const on = cells.current[i] !== "1";
    drag.current = { on, last: i };
    flip(i, on);
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const i = cellFrom(e);
    if (i === null || i === d.last) return;
    for (const c of cellsBetween(d.last, i)) flip(c, d.on);
    d.last = i;
  };

  const up = () => {
    drag.current = null;
  };

  const key = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (offline) return;
    const c = cursor.current ?? 0;
    const moves: Record<string, number> = {
      ArrowLeft: c % COLS ? c - 1 : c,
      ArrowRight: c % COLS < COLS - 1 ? c + 1 : c,
      ArrowUp: c >= COLS ? c - COLS : c,
      ArrowDown: c < CELLS - COLS ? c + COLS : c,
    };
    if (e.key in moves) {
      e.preventDefault();
      cursor.current = moves[e.key];
      redraw.current();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      flip(c, cells.current[c] !== "1");
    }
  };

  return (
    <div className="wall">
      <canvas
        ref={canvas}
        className="wall-canvas"
        role="img"
        tabIndex={offline ? -1 : 0}
        aria-label="Shared pixel wall, 32 by 8. Arrow keys move, space flips a pixel."
        data-offline={offline || undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
        onFocus={() => {
          cursor.current ??= 0;
          redraw.current();
        }}
        onBlur={() => {
          cursor.current = null;
          redraw.current();
        }}
      />
      <p className="wall-note">
        <span>{offline ? "wall offline." : "flip a pixel. everyone sees it."}</span>
        {!offline && visit && <span>{visit}</span>}
      </p>
    </div>
  );
}
