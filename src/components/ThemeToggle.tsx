"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

const listeners = new Set<() => void>();
const read = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Private mode or blocked storage: the choice just won't be remembered.
  }
  listeners.forEach((notify) => notify());
}

/**
 * Switches between the dark and light palettes. Where the browser supports
 * it, the new palette tears in across the page in hard steps.
 */
export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  const toggle = () => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calm || !document.startViewTransition) {
      apply(next);
      return;
    }
    document.startViewTransition(() => apply(next));
  };

  return (
    <button
      type="button"
      className="theme"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      suppressHydrationWarning
    >
      {/* Pixel sun and moon; CSS shows the one for the mode you'd switch to. */}
      <svg className="theme-sun" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 0h2v2H7zM7 14h2v2H7zM0 7h2v2H0zM14 7h2v2h-2zM2 2h2v2H2zM12 2h2v2h-2zM2 12h2v2H2zM12 12h2v2h-2zM5 5h6v6H5z"
        />
      </svg>
      <svg className="theme-moon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M6 1h4v2H8v2H6v6h2v2h6v-2h1v2h-1v2H6v-2H4v-2H2V5h2V3h2z"
        />
      </svg>
    </button>
  );
}
