"use client";

import { useRef } from "react";

const STICKERS = [
  { text: "null.rot", tone: "acid", x: 4, y: 18, r: -7 },
  { text: "handle with care", tone: "bone", x: 27, y: 50, r: 5 },
  { text: "made in davao", tone: "rust", x: 56, y: 14, r: -4 },
  { text: "no bugs (probably)", tone: "bone", x: 76, y: 48, r: 3 },
] as const;

/** Loose labels you can drag around and fling. Decorative only. */
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
