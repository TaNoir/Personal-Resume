import { describe, expect, it } from "vitest";
import { BLANK, CELLS, COLS, ROWS, parseCells, parseFlip, parseVisit, setCell, visitLine } from "./wall";

describe("wall cells", () => {
  it("is a 32 by 8 grid of 256 cells", () => {
    expect([COLS, ROWS, CELLS]).toEqual([32, 8, 256]);
    expect(BLANK).toBe("0".repeat(256));
  });
  it("treats anything that isn't a string as a blank wall", () => {
    expect(parseCells(undefined)).toBe(BLANK);
    expect(parseCells(null)).toBe(BLANK);
    expect(parseCells(42)).toBe(BLANK);
  });
  it("normalises a stored wall to exactly 256 zeros and ones", () => {
    expect(parseCells("1".repeat(300))).toBe("1".repeat(256));
    const odd = parseCells("1x1");
    expect(odd.slice(0, 3)).toBe("101");
    expect(odd).toHaveLength(256);
  });
  it("sets one cell on or off and keeps the length", () => {
    const on = setCell(BLANK, 3, true);
    expect(on[3]).toBe("1");
    expect(on).toHaveLength(256);
    expect(setCell(on, 3, false)).toBe(BLANK);
  });
});

describe("flip requests", () => {
  it("accepts a whole cell index and a boolean", () => {
    expect(parseFlip({ i: 0, on: true })).toEqual({ i: 0, on: true });
    expect(parseFlip({ i: 255, on: false })).toEqual({ i: 255, on: false });
  });
  it("rejects anything else", () => {
    for (const bad of [{ i: -1, on: true }, { i: 256, on: true }, { i: 3.5, on: true }, { i: "4", on: true }, { i: 1 }, { i: 1, on: "yes" }, null, "x"])
      expect(parseFlip(bad)).toBeNull();
  });
});

describe("last visitor", () => {
  const osaka = { city: "Osaka", country: "JP", at: "2026-11-20T10:00:00Z" };
  it("reads a stored visit", () => {
    expect(parseVisit(osaka)).toEqual(osaka);
  });
  it("rejects a visit without a city, country or real date", () => {
    expect(parseVisit({ ...osaka, city: "" })).toBeNull();
    expect(parseVisit({ ...osaka, country: undefined })).toBeNull();
    expect(parseVisit({ ...osaka, at: "soon" })).toBeNull();
    expect(parseVisit("Osaka")).toBeNull();
  });
  it("keeps stored names short", () => {
    const v = parseVisit({ ...osaka, city: "x".repeat(80), country: "JPN" });
    expect(v?.city).toHaveLength(40);
    expect(v?.country).toBe("JP");
  });
  it("words the line under the wall", () => {
    expect(visitLine(osaka, new Date("2026-11-20T10:03:00Z"))).toBe("last visit from Osaka, JP · 3m ago");
  });
});
