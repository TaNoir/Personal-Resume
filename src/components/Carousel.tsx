"use client";

import { Children, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

/**
 * Slides that swipe and snap sideways, one at a time. The scrolling is the
 * browser's own, so touch, trackpads and the keyboard all work; the buttons
 * and bars only jump it to a slide.
 */
export default function Carousel({ label, children }: { label: string; children: ReactNode }) {
  const slides = Children.toArray(children);
  const n = slides.length;
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);

  // Whichever slide sits closest to the left edge is the current one.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const items = [...el.children] as HTMLElement[];
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) return setAt(items.length - 1);
        const gap = (item: HTMLElement) => Math.abs(item.offsetLeft - items[0].offsetLeft - el.scrollLeft);
        let best = 0;
        items.forEach((item, i) => {
          if (gap(item) < gap(items[best])) best = i;
        });
        setAt(best);
      });
    };
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const go = (i: number) => {
    const el = track.current;
    const item = el?.children[Math.max(0, Math.min(n - 1, i))] as HTMLElement | undefined;
    const first = el?.children[0] as HTMLElement | undefined;
    if (!el || !item || !first) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: item.offsetLeft - first.offsetLeft, behavior: calm ? "auto" : "smooth" });
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      go(at + (e.key === "ArrowRight" ? 1 : -1));
    }
  };

  return (
    <div className="carousel" role="region" aria-roledescription="carousel" aria-label={label} data-reveal="slide">
      <div ref={track} id={id} className="carousel-track" tabIndex={0} onKeyDown={onKey}>
        {slides.map((slide, i) => (
          <div
            key={i}
            className="carousel-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${n}`}
          >
            {slide}
          </div>
        ))}
      </div>
      {n > 1 && (
        <div className="carousel-nav">
          <div className="carousel-bars">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show ${i + 1} of ${n}`}
                aria-controls={id}
                aria-current={i === at}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <span className="carousel-count" aria-hidden="true">
            {pad(at + 1)} <span>/ {pad(n)}</span>
          </span>
          <button
            type="button"
            className="carousel-btn"
            aria-label="Previous"
            aria-controls={id}
            disabled={at === 0}
            onClick={() => go(at - 1)}
          >
            <Chevron />
          </button>
          <button
            type="button"
            className="carousel-btn"
            aria-label="Next"
            aria-controls={id}
            disabled={at === n - 1}
            onClick={() => go(at + 1)}
          >
            <Chevron flip />
          </button>
        </div>
      )}
    </div>
  );
}
