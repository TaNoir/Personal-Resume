const MODIFIERS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock"]);
const CODE = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];

/**
 * Advances the Konami code by one key press. `progress` is how many keys of
 * the code have been matched so far; the code is complete at 10. A wrong key
 * keeps whatever tail still matches the start, so up-up-up-down counts as 3.
 */
export function konamiStep(progress: number, key: string): number {
  // Shift and friends arrive as keys of their own; they don't break the code.
  if (MODIFIERS.has(key)) return progress;
  const typed = [...CODE.slice(0, progress >= CODE.length ? 0 : progress), key.toLowerCase()];
  for (let k = Math.min(typed.length, CODE.length); k > 0; k--) {
    const tail = typed.slice(typed.length - k);
    if (tail.every((t, i) => t === CODE[i])) return k;
  }
  return 0;
}
