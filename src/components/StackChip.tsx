"use client";

import { useId, useRef } from "react";

const NOISE = "#%&$@!?<>/\\[]{}=+*01";
const EDGE = 12;

/**
 * One stack item. Hovering, focusing or tapping it scrambles the name and
 * opens a short plain-language note about what the thing is.
 */
export default function StackChip({ name, kind, what }: { name: string; kind?: string; what?: string }) {
  const id = useId();
  const chip = useRef<HTMLLIElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep the note inside the screen: nudge it sideways if it would spill out.
  const place = () => {
    if (!chip.current || !tip.current) return;
    const c = chip.current.getBoundingClientRect();
    const w = tip.current.offsetWidth;
    const centred = c.left + c.width / 2 - w / 2;
    const clamped = Math.max(EDGE, Math.min(centred, document.documentElement.clientWidth - EDGE - w));
    tip.current.style.setProperty("--nudge", `${clamped - centred}px`);
  };

  const scramble = () => {
    const el = label.current;
    if (!el || timer.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Noise letters are wider than the real ones. Hold the label at its
    // resting width so the chip can't grow, wrap to the next line and slide
    // out from under the pointer.
    el.style.width = `${el.getBoundingClientRect().width}px`;
    let step = 0;
    timer.current = setInterval(() => {
      step += 0.5;
      el.textContent = name
        .split("")
        .map((ch, i) => (i < step || ch === " " ? ch : NOISE[(Math.random() * NOISE.length) | 0]))
        .join("");
      if (step >= name.length) {
        clearInterval(timer.current!);
        timer.current = null;
        el.textContent = name;
        el.style.width = "";
      }
    }, 28);
  };

  const open = () => {
    place();
    scramble();
  };

  return (
    <li
      ref={chip}
      className="chip"
      tabIndex={0}
      aria-describedby={what ? id : undefined}
      onPointerEnter={open}
      onFocus={open}
    >
      <span ref={label} className="chip-label">{name}</span>
      {what && (
        <span ref={tip} id={id} role="tooltip" className="tip">
          <span className="tip-kind">{kind}</span>
          {what}
        </span>
      )}
    </li>
  );
}
