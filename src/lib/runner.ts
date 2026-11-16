/**
 * "Dog on the roof": a tiny endless runner. Pure game rules only; the
 * drawing and input live in DogRunner.tsx. Units are logical pixels and
 * seconds, on a 320 x 120 screen. The dog stays put; the roofs slide left.
 */

export const VIEW_W = 320;
export const VIEW_H = 120;
export const ROOF_Y = 96;
export const DOG_X = 48;
export const DOG_W = 18;
export const DOG_H = 16;
export const GRAVITY = 900;
export const JUMP_V = 300;
export const SPEED_START = 90;
export const SPEED_GAIN = 4;
export const SPEED_MAX = 220;
export const MAX_STEP_MS = 50;
export const CHIMNEY_W = 8;
export const CHIMNEY_H = 14;

const GAP_MIN = 28;
const GAP_CAP = 70;
const ROOF_MIN = 90;
const ROOF_MAX = 220;
const CHIMNEY_EDGE = 40;
// Seconds of running kept clear between a roof edge and its chimney.
const CHIMNEY_LEAD = 0.3;
const SUBSTEP = 1 / 120;
// Forgiveness at the edges, so a paw over the lip still counts.
const FOOTING = 4;
const HITBOX = 2;

/** A roof: left edge on screen, width, and chimney offsets from its left edge. */
export type Roof = { x: number; w: number; chimneys: number[] };

export type Game = {
  status: "ready" | "running" | "over";
  /** Seconds of running. */
  t: number;
  distance: number;
  speed: number;
  /** Where the dog's feet are; standing is ROOF_Y. */
  dogY: number;
  dogVy: number;
  grounded: boolean;
  roofs: Roof[];
  seed: number;
  /** Random generator state, so the same seed always builds the same city. */
  rng: number;
};

/** Widest gap allowed at a speed: a bit over half a jump's reach, capped. */
export function maxGap(speed: number): number {
  return Math.min(GAP_CAP, 0.55 * speed * ((2 * JUMP_V) / GRAVITY));
}

export const score = (game: Game) => Math.floor(game.distance / 10);

export function parseBest(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Same LCG as the banner sky.
const nextRng = (state: number) => (state * 1664525 + 1013904223) >>> 0;

/** Adds roofs ahead until the city reaches two screens past the right edge. */
function build(roofs: Roof[], rng: number, speed: number): { roofs: Roof[]; rng: number } {
  const out = [...roofs];
  let state = rng;
  const random = () => {
    state = nextRng(state);
    return state / 4294967296;
  };
  let last = out[out.length - 1];
  while (last.x + last.w < VIEW_W * 2) {
    const gap = GAP_MIN + random() * (maxGap(speed) - GAP_MIN);
    const w = ROOF_MIN + random() * (ROOF_MAX - ROOF_MIN);
    // A chimney never sits right where the dog lands, nor so near the far end
    // that jumping it drops the dog into the next gap. The faster the run,
    // the more room it keeps on both sides, so fast roofs often have none.
    const margin = CHIMNEY_EDGE + speed * CHIMNEY_LEAD;
    const room = w - 2 * margin - CHIMNEY_W;
    const roll = random();
    const place = random();
    const chimneys = roll < 0.5 && room > 0 ? [margin + place * room] : [];
    last = { x: last.x + last.w + gap, w, chimneys };
    out.push(last);
  }
  return { roofs: out, rng: state };
}

export function newGame(seed: number): Game {
  const start: Roof = { x: 0, w: VIEW_W + 40, chimneys: [] };
  const { roofs, rng } = build([start], seed >>> 0 || 1, SPEED_START);
  return {
    status: "ready",
    t: 0,
    distance: 0,
    speed: SPEED_START,
    dogY: ROOF_Y,
    dogVy: 0,
    grounded: true,
    roofs,
    seed,
    rng,
  };
}

const under = (r: Roof) => r.x < DOG_X + DOG_W - FOOTING && r.x + r.w > DOG_X + FOOTING;

function hitsChimney(roofs: Roof[], dogY: number): boolean {
  const top = dogY - DOG_H + HITBOX;
  const left = DOG_X + HITBOX;
  const right = DOG_X + DOG_W - HITBOX;
  return roofs.some((r) =>
    r.chimneys.some((c) => {
      const cx = r.x + c;
      return cx < right && cx + CHIMNEY_W > left && dogY > ROOF_Y - CHIMNEY_H && top < ROOF_Y;
    }),
  );
}

/**
 * Advances the game by `dtMs`. `jump` is one press: it starts a waiting
 * game, jumps if the dog is on a roof, or restarts a finished one. Long
 * frames (a hidden tab coming back) count as at most 50 ms.
 */
export function step(game: Game, dtMs: number, jump: boolean): Game {
  if (game.status === "ready") return jump ? { ...game, status: "running" } : game;
  if (game.status === "over") return jump ? { ...newGame(game.seed + 1), status: "running" } : game;

  let { t, distance, speed, dogY, dogVy, grounded } = game;
  let roofs = game.roofs;
  let rng = game.rng;
  let status: Game["status"] = "running";

  if (jump && grounded) {
    dogVy = -JUMP_V;
    grounded = false;
  }

  let left = Math.min(Math.max(dtMs, 0), MAX_STEP_MS) / 1000;
  while (left > 1e-9 && status === "running") {
    const h = Math.min(SUBSTEP, left);
    left -= h;

    t += h;
    speed = Math.min(SPEED_MAX, SPEED_START + SPEED_GAIN * t);
    const dx = speed * h;
    distance += dx;
    roofs = roofs.map((r) => ({ ...r, x: r.x - dx })).filter((r) => r.x + r.w > -VIEW_W);

    if (grounded && !roofs.some(under)) grounded = false;

    if (!grounded) {
      const before = dogY;
      dogVy += GRAVITY * h;
      dogY += dogVy * h;
      if (dogVy > 0 && before <= ROOF_Y && dogY >= ROOF_Y && roofs.some(under)) {
        dogY = ROOF_Y;
        dogVy = 0;
        grounded = true;
      }
    }

    // Below roof level, any roof alongside is a wall; off the bottom is a fall.
    const inWall = dogY > ROOF_Y + 1 && roofs.some(under);
    if (dogY > VIEW_H || inWall || hitsChimney(roofs, dogY)) status = "over";

    if (roofs[roofs.length - 1].x + roofs[roofs.length - 1].w < VIEW_W * 2) {
      ({ roofs, rng } = build(roofs, rng, speed));
    }
  }

  return { ...game, status, t, distance, speed, dogY, dogVy, grounded, roofs, rng };
}
