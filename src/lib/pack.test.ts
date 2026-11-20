import { describe, expect, it } from "vitest";
import { FLEE_RADIUS, assignSlots, glyphSlots, steer } from "./pack";

describe("404 formation", () => {
  it("spells 404 in a 3 by 5 pixel font, 30 spots in all", () => {
    const slots = glyphSlots("404");
    expect(slots).toHaveLength(9 + 12 + 9);
    // Every spot sits on the grid: 3 columns per digit plus a 1-column gap.
    for (const s of slots) {
      expect(s.col).toBeGreaterThanOrEqual(0);
      expect(s.col).toBeLessThan(11);
      expect(s.row).toBeGreaterThanOrEqual(0);
      expect(s.row).toBeLessThan(5);
      expect(s.col % 4).not.toBe(3);
    }
    // The 0's hollow middle stays empty.
    expect(slots.some((s) => s.col === 5 && s.row === 2)).toBe(false);
  });
  it("ignores characters it has no shape for", () => {
    expect(glyphSlots("4?4")).toHaveLength(18 + 0);
  });
});

describe("assigning animals to spots", () => {
  it("gives each spot exactly one animal", () => {
    const animals = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 50 },
    ];
    const spots = [
      { x: 95, y: 5 },
      { x: 5, y: 5 },
    ];
    const pick = assignSlots(animals, spots);
    expect(pick).toHaveLength(3);
    expect(pick[0]).toBe(1);
    expect(pick[1]).toBe(0);
    expect(pick[2]).toBe(-1);
  });
});

describe("steering", () => {
  it("moves toward the target without overshooting", () => {
    const v = steer({ x: 0, y: 0 }, { x: 10, y: 0 }, 100, 1, null);
    expect(v).toEqual({ x: 10, y: 0, moved: true });
  });
  it("stays put once there", () => {
    expect(steer({ x: 5, y: 5 }, { x: 5, y: 5 }, 100, 1, null)).toEqual({ x: 5, y: 5, moved: false });
  });
  it("runs away from a pointer that comes close", () => {
    const v = steer({ x: 50, y: 50 }, { x: 50, y: 50 }, 100, 0.1, { x: 40, y: 50 });
    expect(v.x).toBeGreaterThan(50);
    expect(v.moved).toBe(true);
  });
  it("waits at the edge instead of pacing in and out when its spot is under the pointer", () => {
    // Just outside the flee circle, with its spot inside it: hold still.
    const v = steer({ x: 50 + FLEE_RADIUS + 4, y: 50 }, { x: 55, y: 50 }, 100, 0.1, { x: 50, y: 50 });
    expect(v).toEqual({ x: 50 + FLEE_RADIUS + 4, y: 50, moved: false });
  });
  it("ignores a pointer that is far away", () => {
    expect(steer({ x: 50, y: 50 }, { x: 50, y: 50 }, 100, 0.1, { x: 400, y: 50 }).moved).toBe(false);
  });
});
