"use client";

import { useEffect } from "react";

/**
 * Turns on scroll reveals for every [data-reveal] element.
 * Without JavaScript nothing is hidden: the hidden state only applies
 * once this has run and marked the document.
 */
export default function Reveals() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.shown = "";
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    // Anything already scrolled past should simply be there.
    for (const el of targets) {
      if (el.getBoundingClientRect().bottom < 0) el.dataset.shown = "";
      else io.observe(el);
    }
    root.classList.add("reveal-on");

    return () => {
      io.disconnect();
      root.classList.remove("reveal-on");
    };
  }, []);

  return null;
}
