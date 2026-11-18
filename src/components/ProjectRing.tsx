"use client";

import { Children, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** Covers on the ring; slots without a project hold an empty card. */
const MIN_SLOTS = 10;
/** Degrees per second: one full turn every 20 seconds. */
const SPIN = 18;
const EASE_MS = 750;

const pad = (n: number) => String(n).padStart(2, "0");
/** An angle folded into -180..180, the shortest way round. */
const fold = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

function Star() {
  return (
    <svg className="star" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
      <path d="M12 0c.9 7.2 4.8 11.1 12 12-7.2.9-11.1 4.8-12 12-.9-7.2-4.8-11.1-12-12 7.2-.9 11.1-4.8 12-12Z" fill="currentColor" />
    </svg>
  );
}

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

type Item = { name: string; year: string };

/**
 * A ring of project covers turning slowly in 3D, with the chosen project's
 * full card underneath. It pauses while hovered; picking a project stops it
 * and turns that cover to the front. Without motion it simply stands still.
 */
export default function ProjectRing({ items, children }: { items: readonly Item[]; children: ReactNode }) {
  const panels = Children.toArray(children);
  const n = items.length;
  const slots = Math.max(MIN_SLOTS, n);
  const step = 360 / slots;
  // Projects spread evenly round the ring, so one comes past every so often.
  const slotOf = items.map((_, i) => Math.round((i * slots) / n));

  const stage = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const turnTo = useRef<(slot: number) => void>(() => {});
  const [at, setAt] = useState(0);

  useEffect(() => {
    const box = stage.current;
    const el = ring.current;
    if (!box || !el) return;
    const cards = [...el.children] as HTMLElement[];
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let angle = 0;
    let raf = 0;
    let last = 0;
    let spinning = !calm;
    let held = false;
    let seen = false;
    let tween: { from: number; to: number; start: number } | null = null;

    // Covers dim as they swing round the back.
    const paint = () => {
      el.style.setProperty("--spin", `${angle}deg`);
      cards.forEach((card, k) => {
        const facing = (Math.cos(((angle + k * step) * Math.PI) / 180) + 1) / 2;
        card.style.filter = `brightness(${(0.3 + 0.7 * facing).toFixed(3)})`;
      });
    };

    const moving = () => seen && !document.hidden && (tween !== null || (spinning && !held));

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(now - last, 50) : 0;
      last = now;
      if (tween) {
        const t = Math.min(1, (now - tween.start) / EASE_MS);
        angle = tween.from + (tween.to - tween.from) * (1 - (1 - t) ** 3);
        if (t >= 1) tween = null;
      } else if (spinning && !held) {
        angle = (angle + (SPIN * dt) / 1000) % 360;
      }
      paint();
      if (moving()) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const wake = () => {
      if (!raf && moving()) raf = requestAnimationFrame(frame);
    };

    turnTo.current = (slot) => {
      spinning = false;
      const to = angle + fold(-slot * step - angle);
      if (calm) {
        angle = to;
        paint();
        return;
      }
      tween = { from: angle, to, start: performance.now() };
      wake();
    };

    const hold = () => {
      held = true;
    };
    const release = () => {
      held = false;
      wake();
    };
    const io = new IntersectionObserver(([entry]) => {
      seen = entry.isIntersecting;
      wake();
    });

    paint();
    io.observe(box);
    box.addEventListener("pointerenter", hold);
    box.addEventListener("pointerleave", release);
    box.addEventListener("focusin", hold);
    box.addEventListener("focusout", release);
    document.addEventListener("visibilitychange", wake);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      box.removeEventListener("pointerenter", hold);
      box.removeEventListener("pointerleave", release);
      box.removeEventListener("focusin", hold);
      box.removeEventListener("focusout", release);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [step]);

  const go = (i: number) => {
    const next = ((i % n) + n) % n;
    setAt(next);
    turnTo.current(slotOf[next]);
  };

  return (
    <div className="orbit" data-reveal="slide">
      <div ref={stage} className="orbit-stage">
        <div ref={ring} className="orbit-spin" style={{ "--step": `${step}deg` } as CSSProperties}>
          {Array.from({ length: slots }, (_, k) => {
            const i = slotOf.indexOf(k);
            const style = { "--k": k } as CSSProperties;
            if (i < 0) {
              return (
                <div key={k} className="orbit-card is-empty" style={style} aria-hidden="true">
                  <span>sector {pad(k + 1)}</span>
                  <span>empty</span>
                </div>
              );
            }
            return (
              <button
                key={k}
                type="button"
                className="orbit-card"
                style={style}
                aria-pressed={i === at}
                aria-label={`Show ${items[i].name}`}
                onClick={() => go(i)}
              >
                <span>{items[i].year}</span>
                <Star />
                <span className="orbit-name">{items[i].name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="orbit-panels">
        {panels.map((panel, i) => (
          <div key={i} hidden={i !== at}>
            {panel}
          </div>
        ))}
      </div>

      {n > 1 && (
        <div className="carousel-nav">
          <div className="carousel-bars">
            {items.map((item, i) => (
              <button
                key={item.name}
                type="button"
                aria-label={`Show ${item.name}`}
                aria-current={i === at}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <span className="carousel-count" aria-hidden="true">
            {pad(at + 1)} <span>/ {pad(n)}</span>
          </span>
          <button type="button" className="carousel-btn" aria-label="Previous project" onClick={() => go(at - 1)}>
            <Chevron />
          </button>
          <button type="button" className="carousel-btn" aria-label="Next project" onClick={() => go(at + 1)}>
            <Chevron flip />
          </button>
        </div>
      )}
    </div>
  );
}
