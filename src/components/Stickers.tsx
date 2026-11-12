"use client";

import { useRef } from "react";

const STICKERS = [
  { text: "null.rot", tone: "pale", x: 0, y: 10, r: -6 },
  { text: "handle with care", tone: "blue", x: 24, y: 46, r: 4 },
  { text: "made in davao", tone: "dark", x: 62, y: 8, r: -3 },
] as const;

/** Loose labels you can drag around. Decorative only. */
export default function Stickers() {
  return (
    <div className="stickers" aria-hidden="true">
      {STICKERS.map((s) => (
        <Sticker key={s.text} {...s} />
      ))}
    </div>
  );
}

function Sticker({ text, tone, x, y, r }: (typeof STICKERS)[number]) {
  const el = useRef<HTMLSpanElement>(null);
  const drag = useRef({ on: false, sx: 0, sy: 0, ox: 0, oy: 0, rot: r as number });

  const place = () => {
    const d = drag.current;
    if (el.current) {
      el.current.style.transform = `translate(${d.ox}px, ${d.oy}px) rotate(${d.rot}deg)`;
    }
  };

  return (
    <span
      ref={el}
      className={`sticker sticker-${tone}`}
      style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${r}deg)` }}
      onPointerDown={(e) => {
        const d = drag.current;
        d.on = true;
        d.sx = e.clientX - d.ox;
        d.sy = e.clientY - d.oy;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.dataset.held = "true";
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d.on) return;
        d.ox = e.clientX - d.sx;
        d.oy = e.clientY - d.sy;
        d.rot = r + Math.max(-14, Math.min(14, e.movementX * 0.8));
        place();
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        d.on = false;
        d.rot = r + (Math.random() - 0.5) * 16;
        delete e.currentTarget.dataset.held;
        place();
      }}
      onPointerCancel={(e) => {
        drag.current.on = false;
        delete e.currentTarget.dataset.held;
      }}
    >
      {text}
    </span>
  );
}
