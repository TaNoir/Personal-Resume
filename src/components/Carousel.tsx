"use client";

import {
  Children,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

const pad = (n: number) => String(n).padStart(2, "0");
/** How far the mouse moves before a press becomes a drag. */
const DRAG_START = 6;
/** Share of a slide's width a drag must cover to move on to the next one. */
const DRAG_TURN = 0.15;

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

/**
 * Slides that swipe and snap sideways, one at a time. The scrolling is the
 * browser's own, so touch, trackpads and the keyboard all work; a mouse can
 * drag it too, and the buttons and bars jump it to a slide.
 */
export default function Carousel({
  label,
  titles,
  children,
}: {
  label: string;
  /** Names for the slides. With them the bars become named tabs. */
  titles?: string[];
  children: ReactNode;
}) {
  const slides = Children.toArray(children);
  const n = slides.length;
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const dragged = useRef(false);

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

  // Snapping is off while the mouse drags; it comes back once the slide has
  // finished gliding into place, so it can't yank the slide back halfway.
  const settle = () => {
    const el = track.current;
    if (!el) return;
    const done = () => {
      clearTimeout(timer);
      el.removeEventListener("scrollend", done);
      el.classList.remove("is-dragging");
    };
    const timer = setTimeout(done, 800);
    el.addEventListener("scrollend", done);
  };

  const grab = (e: PointerEvent<HTMLDivElement>) => {
    dragged.current = false;
    if (e.pointerType !== "mouse" || e.button !== 0 || !track.current) return;
    drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false };
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = track.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_START) return;
      d.moved = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
      window.getSelection()?.removeAllRanges();
    }
    el.scrollLeft = d.left - dx;
  };

  const drop = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = track.current;
    drag.current = null;
    if (!d?.moved || !el) return;
    dragged.current = true;
    const items = el.children as HTMLCollectionOf<HTMLElement>;
    const stride = n > 1 ? items[1].offsetLeft - items[0].offsetLeft : el.clientWidth;
    const from = Math.round(d.left / stride);
    const dx = e.clientX - d.x;
    const turn = stride * DRAG_TURN;
    go(from + (dx < -turn ? 1 : dx > turn ? -1 : 0));
    settle();
  };

  // A drag that ends over a link shouldn't follow it.
  const swallow = (e: MouseEvent<HTMLDivElement>) => {
    if (!dragged.current) return;
    dragged.current = false;
    e.preventDefault();
    e.stopPropagation();
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
      <div
        ref={track}
        id={id}
        className="carousel-track"
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={grab}
        onPointerMove={move}
        onPointerUp={drop}
        onPointerCancel={drop}
        onClickCapture={swallow}
        onDragStart={(e) => e.preventDefault()}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="carousel-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={titles?.[i] ?? `${i + 1} of ${n}`}
          >
            {slide}
          </div>
        ))}
      </div>
      {n > 1 && (
        <div className="carousel-nav">
          <div className={titles ? "carousel-bars carousel-tabs" : "carousel-bars"}>
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={titles?.[i] ? undefined : `Show ${i + 1} of ${n}`}
                aria-controls={id}
                aria-current={i === at}
                onClick={() => go(i)}
              >
                {titles?.[i] && <span>{titles[i]}</span>}
              </button>
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
