"use client";

import { useEffect, useRef } from "react";

const POOL = 16;
const GAP_PX = 22;

/**
 * Little four-point stars that fall off the mouse pointer as it moves.
 * Only on devices with a real mouse, and never with reduced motion.
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
      star.style.left = `${e.clientX}px`;
      star.style.top = `${e.clientY}px`;
      star.style.setProperty("--drift", `${(Math.random() - 0.5) * 30}px`);
      star.style.setProperty("--size", `${6 + Math.random() * 7}px`);
      // Restart the fall animation on a recycled star.
      star.classList.remove("on");
      void star.offsetWidth;
      star.classList.add("on");
    };

    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <div ref={layer} className="trail" aria-hidden="true">
      {Array.from({ length: POOL }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24">
          <path
            d="M12 0c.9 7.2 4.8 11.1 12 12-7.2.9-11.1 4.8-12 12-.9-7.2-4.8-11.1-12-12 7.2-.9 11.1-4.8 12-12Z"
            fill="currentColor"
          />
        </svg>
      ))}
    </div>
  );
}
