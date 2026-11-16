export type Theme = "dark" | "light";

const listeners = new Set<() => void>();

export const readTheme = (): Theme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

export const subscribeTheme = (notify: () => void) => {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
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
 * Switches palettes. Where the browser supports it, the new palette tears in
 * across the page in hard steps.
 */
export function setTheme(theme: Theme) {
  if (theme === readTheme()) return;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (calm || !document.startViewTransition) {
    apply(theme);
    return;
  }
  document.startViewTransition(() => apply(theme));
}
