/** The 404 page's pack of dogs and cats: where they stand and how they move. */

export type Point = { x: number; y: number };
export type Slot = { col: number; row: number };

// A 3 by 5 pixel font, just the characters the page spells.
const FONT: Record<string, string[]> = {
  "4": ["X.X", "X.X", "XXX", "..X", "..X"],
  "0": ["XXX", "X.X", "X.X", "X.X", "XXX"],
};

/** Grid spots that spell `text`, 3 columns per character and a 1-column gap. */
export function glyphSlots(text: string): Slot[] {
  const slots: Slot[] = [];
  [...text].forEach((ch, k) => {
    FONT[ch]?.forEach((line, row) => {
      [...line].forEach((cell, c) => {
        if (cell === "X") slots.push({ col: k * 4 + c, row });
      });
    });
  });
  return slots;
}

/**
 * Which spot each animal heads for (-1 for none), closest pairs first, so
 * the pack settles without everyone crossing the screen.
 */
export function assignSlots(animals: Point[], spots: Point[]): number[] {
  const pairs: [number, number, number][] = [];
  animals.forEach((a, i) => spots.forEach((s, j) => pairs.push([(a.x - s.x) ** 2 + (a.y - s.y) ** 2, i, j])));
  pairs.sort((p, q) => p[0] - q[0]);
  const pick = animals.map(() => -1);
  const taken = new Set<number>();
  for (const [, i, j] of pairs) {
    if (pick[i] !== -1 || taken.has(j)) continue;
    pick[i] = j;
    taken.add(j);
  }
  return pick;
}

/** How close the pointer can get before an animal bolts. */
export const FLEE_RADIUS = 60;
const EDGE_BAND = 10;

/**
 * One animal's next position: away from a pointer that is too close,
 * otherwise toward its target, never past it.
 */
export function steer(
  pos: Point,
  target: Point,
  speed: number,
  dt: number,
  pointer: Point | null,
): Point & { moved: boolean } {
  if (pointer) {
    const dx = pos.x - pointer.x;
    const dy = pos.y - pointer.y;
    const d = Math.hypot(dx, dy);
    if (d < FLEE_RADIUS) {
      const step = speed * 1.8 * dt;
      const ux = d ? dx / d : 1;
      const uy = d ? dy / d : 0;
      return { x: pos.x + ux * step, y: pos.y + uy * step, moved: true };
    }
    // Its spot is under the pointer: wait just outside rather than step in,
    // get chased out and step in again every frame.
    const near = d < FLEE_RADIUS + EDGE_BAND;
    if (near && Math.hypot(target.x - pointer.x, target.y - pointer.y) < FLEE_RADIUS + EDGE_BAND) {
      return { x: pos.x, y: pos.y, moved: false };
    }
  }
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return { x: pos.x, y: pos.y, moved: false };
  const step = Math.min(d, speed * dt);
  return { x: pos.x + (dx / d) * step, y: pos.y + (dy / d) * step, moved: true };
}
