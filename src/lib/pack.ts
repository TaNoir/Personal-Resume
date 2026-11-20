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

/**
 * How far along the straight walk from a to b (0 to 1) it enters the inside
 * of the box, or -1 if it never does.
 */
function entry(a: Point, b: Point, box: Box): number {
  // Liang-Barsky: clip the walk to the box and see if anything is left.
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number) => {
    if (p === 0) return q > 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      t0 = Math.max(t0, r);
    } else {
      if (r < t0) return false;
      t1 = Math.min(t1, r);
    }
    return true;
  };
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const hit =
    clip(-dx, a.x - box.left) && clip(dx, box.right - a.x) && clip(-dy, a.y - box.top) && clip(dy, box.bottom - a.y);
  return hit && t1 - t0 > 1e-6 ? t0 : -1;
}

const crosses = (a: Point, b: Point, box: Box) => entry(a, b, box) >= 0;

/**
 * Where to walk next on the way to `target`: the target itself when the way
 * is clear, otherwise the first corner on the shortest way around the box
 * in the way, so animals go around text instead of across it.
 */
export function detour(pos: Point, target: Point, boxes: Box[], depth = 3): Point {
  if (depth === 0 || boxes.some((b) => within(target, b))) return target;
  // The first box the walk runs into.
  let box: Box | undefined;
  let first = Infinity;
  for (const b of boxes) {
    const t = entry(pos, target, b);
    if (t >= 0 && t < first) [box, first] = [b, t];
  }
  if (!box) return target;
  const o = 2;
  const corners = [
    { x: box.left - o, y: box.top - o },
    { x: box.right + o, y: box.top - o },
    { x: box.left - o, y: box.bottom + o },
    { x: box.right + o, y: box.bottom + o },
  ];
  // Shortest path from here to the target through the corners (Dijkstra on
  // six points). Following it every frame never turns back, because the
  // rest of a shortest path is still the shortest path.
  const nodes = [pos, ...corners.filter((c) => Math.hypot(c.x - pos.x, c.y - pos.y) >= 1), target];
  const last = nodes.length - 1;
  const dist = nodes.map((_, i) => (i === 0 ? 0 : Infinity));
  const prev = nodes.map(() => -1);
  const done = new Set<number>();
  while (done.size < nodes.length) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++) if (!done.has(i) && (u < 0 || dist[i] < dist[u])) u = i;
    if (dist[u] === Infinity) break;
    done.add(u);
    for (let v = 0; v < nodes.length; v++) {
      if (done.has(v) || crosses(nodes[u], nodes[v], box)) continue;
      const d = dist[u] + Math.hypot(nodes[v].x - nodes[u].x, nodes[v].y - nodes[u].y);
      if (d < dist[v]) [dist[v], prev[v]] = [d, u];
    }
  }
  if (dist[last] === Infinity) return target;
  let step = last;
  while (prev[step] !== 0) step = prev[step];
  const best = nodes[step];
  // Another box may sit between here and that corner.
  return best === target ? target : detour(pos, best, boxes, depth - 1);
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
