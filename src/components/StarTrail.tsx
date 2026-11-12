"use client";

import { useEffect, useRef } from "react";

const POOL = 20;
const GAP_PX = 18;

/**
 * Little four-point stars that fall off the mouse pointer as it moves.
 * Only on devices with a real mouse, and never with reduced motion.
 *
 * Each star is a recycled element animated with the Web Animations API, so a
 * star can be thrown again reliably even while its last fall is still playing.
 */
export default function StarTrail() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = layer.current;
    if (!host) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || calm) return;

    const stars = Array.from(host.children) as HTMLElement[];
    let next = 0;
    let lastX = -999;
    let lastY = -999;

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) < GAP_PX) return;
      lastX = e.clientX;
      lastY = e.clientY;

      const star = stars[next];
      next = (next + 1) % stars.length;

      const size = 9 + Math.random() * 9;
      const drift = (Math.random() - 0.5) * 40;
      // Drop it just below and right of the crosshair so the cursor doesn't hide it.
      const x = e.clientX + 6 - size / 2;
      const y = e.clientY + 8 - size / 2;

      star.style.width = star.style.height = `${size}px`;
      star.getAnimations().forEach((a) => a.cancel());
      star.animate(
        [
          { opacity: 1, transform: `translate(${x}px, ${y}px) rotate(0deg) scale(1)` },
          { opacity: 0, transform: `translate(${x + drift}px, ${y + 46}px) rotate(90deg) scale(0.35)` },
        ],
        { duration: 1000, easing: "steps(7)", fill: "forwards" },
      );
    };

    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <div ref={layer} className="trail" aria-hidden="true">
      {Array.from({ length: POOL }, (_, i) => (
        <span key={i}>
          <svg viewBox="0 0 24 24">
            <path
              d="M12 0c.9 7.2 4.8 11.1 12 12-7.2.9-11.1 4.8-12 12-.9-7.2-4.8-11.1-12-12 7.2-.9 11.1-4.8 12-12Z"
              fill="currentColor"
            />
          </svg>
        </span>
      ))}
    </div>
  );
}
