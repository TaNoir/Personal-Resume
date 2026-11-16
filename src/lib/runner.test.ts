import { describe, expect, it } from "vitest";
import { CHIMNEY_W, DOG_W, DOG_X, GRAVITY, JUMP_V, MAX_STEP_MS, ROOF_Y, SPEED_MAX, SPEED_START, maxGap, newGame, parseBest, score, step } from "./runner";

const run = (g: ReturnType<typeof newGame>, ms: number, jumpAt: number[] = []) => {
  for (let t = 0; t < ms; t += 10) g = step(g, 10, jumpAt.includes(t));
  return g;
};

describe("runner", () => {
  it("waits for the first jump", () => {
    const g = step(newGame(1), 16, false);
    expect(g.status).toBe("ready");
    expect(g.distance).toBe(0);
    expect(step(g, 16, true).status).toBe("running");
  });
  it("jumps about 50px high and lands back on the roof", () => {
    let g = step(newGame(1), 10, true); // start
    g = step(g, 10, true); // jump
    let top = ROOF_Y;
    for (let i = 0; i < 80; i++) {
      g = step(g, 10, false);
      top = Math.min(top, g.dogY);
    }
    expect(ROOF_Y - top).toBeGreaterThan(44);
    expect(ROOF_Y - top).toBeLessThan((JUMP_V * JUMP_V) / (2 * GRAVITY) + 2);
    expect(g.dogY).toBe(ROOF_Y);
    expect(g.grounded).toBe(true);
  });
  it("cannot double jump", () => {
    let g = step(step(newGame(1), 10, true), 10, true);
    const vy = step(g, 10, false).dogVy;
    g = step(g, 10, true);
    expect(g.dogVy).toBeCloseTo(vy, 5);
  });
  it("speeds up to a cap and scores distance / 10", () => {
    let g = step(newGame(1), 10, true);
    expect(g.speed).toBe(SPEED_START);
    g = { ...g, roofs: [{ x: -100, w: 1e6, chimneys: [] }] }; // endless roof
    g = run(g, 60_000);
    expect(g.speed).toBe(SPEED_MAX);
    expect(score(g)).toBe(Math.floor(g.distance / 10));
  });
  it("ends when the dog never jumps, and restarts on jump", () => {
    const g = run(step(newGame(7), 10, true), 30_000);
    expect(g.status).toBe("over");
    const again = step(g, 10, true);
    expect(again.status).toBe("running");
    expect(again.distance).toBe(0);
  });
  it("only makes gaps the dog can clear", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      let g = step(newGame(seed), 10, true);
      for (let i = 0; i < 3000; i++) {
        g = { ...step(g, 10, false), status: "running", dogY: ROOF_Y, dogVy: 0, grounded: true }; // ghost dog
        for (let r = 1; r < g.roofs.length; r++) {
          const gap = g.roofs[r].x - (g.roofs[r - 1].x + g.roofs[r - 1].w);
          expect(gap).toBeGreaterThanOrEqual(28);
          expect(gap).toBeLessThanOrEqual(70);
        }
      }
    }
    expect(maxGap(SPEED_START)).toBeCloseTo(33, 0);
    expect(maxGap(SPEED_MAX)).toBe(70);
  });
  it("never advances more than 50ms in one step", () => {
    const g = step(newGame(1), 10, true);
    expect(step(g, 5000, false).distance).toBeCloseTo(step(g, MAX_STEP_MS, false).distance, 5);
  });
  it("is deterministic for a seed", () => {
    expect(run(step(newGame(3), 10, true), 4000, [500, 1500])).toEqual(run(step(newGame(3), 10, true), 4000, [500, 1500]));
  });
  it("parses the stored best score", () => {
    expect(parseBest(null)).toBe(0);
    expect(parseBest("abc")).toBe(0);
    expect(parseBest("-5")).toBe(0);
    expect(parseBest("412")).toBe(412);
  });
  it("can be survived for two minutes by a bot that jumps at edges", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      let g = step(newGame(seed), 10, true);
      for (let i = 0; i < 12_000; i++) {
        const lead = g.speed * 0.12;
        const front = DOG_X + DOG_W;
        const edge = g.roofs.some((r) => r.x + r.w > DOG_X && r.x + r.w < front + lead);
        const chimney = g.roofs.some((r) =>
          r.chimneys.some((c) => r.x + c > front && r.x + c < front + g.speed * 0.25 + CHIMNEY_W),
        );
        g = step(g, 10, g.grounded && (edge || chimney));
        expect(g.status, `seed ${seed} at ${i * 10}ms`).toBe("running");
      }
    }
  });
});
