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

/** A screen rectangle the strays stay out of, such as a block of text. */
export type Box = { left: number; top: number; right: number; bottom: number };

const within = (p: Point, b: Box) => p.x > b.left && p.x < b.right && p.y > b.top && p.y < b.bottom;

const overlap = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** Joins boxes that overlap into one box around both, until none overlap. */
export function mergeBoxes(boxes: Box[]): Box[] {
  const out = boxes.map((b) => ({ ...b }));
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      if (!overlap(out[i], out[j])) continue;
      const [b] = out.splice(j, 1);
      out[i] = {
        left: Math.min(out[i].left, b.left),
        top: Math.min(out[i].top, b.top),
        right: Math.max(out[i].right, b.right),
        bottom: Math.max(out[i].bottom, b.bottom),
      };
      j = i; // the grown box may now reach ones already checked
    }
  }
  return out;
}

/** Moves a point that is inside any box out to that box's nearest edge. */
export function keepOut(p: Point, boxes: Box[]): Point & { pushed: boolean } {
  const box = boxes.find((b) => within(p, b));
  if (!box) return { x: p.x, y: p.y, pushed: false };
  const edges = [
    { d: p.x - box.left, x: box.left, y: p.y },
    { d: box.right - p.x, x: box.right, y: p.y },
    { d: p.y - box.top, x: p.x, y: box.top },
    { d: box.bottom - p.y, x: p.x, y: box.bottom },
  ];
  const near = edges.reduce((a, b) => (b.d < a.d ? b : a));
  return { x: near.x, y: near.y, pushed: true };
}

/** A random spot outside every box, or the last one tried if none is free. */
export function freeSpot(random: () => Point, boxes: Box[], tries = 20): Point {
  let p = random();
  for (let i = 1; i < tries && boxes.some((b) => within(p, b)); i++) p = random();
  return p;
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
