"use client";

import { useRef } from "react";

const NOISE = "#%&$@!?<>/\\[]{}=+*01";

/** Text that corrupts and re-resolves, left to right, when hovered or focused. */
export default function Scramble({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const run = () => {
    const el = ref.current;
    if (!el || timer.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let step = 0;
    timer.current = setInterval(() => {
      step += 0.5;
      el.textContent = text
        .split("")
        .map((ch, i) =>
          i < step || ch === " " ? ch : NOISE[(Math.random() * NOISE.length) | 0],
        )
        .join("");
      if (step >= text.length) {
        clearInterval(timer.current!);
        timer.current = null;
        el.textContent = text;
      }
    }, 28);
  };

  return (
    <span ref={ref} className={className} onPointerEnter={run} onFocus={run}>
      {text}
    </span>
  );
}
