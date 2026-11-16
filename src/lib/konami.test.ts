import { expect, it } from "vitest";
import { konamiStep } from "./konami";

const CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const feed = (keys: string[]) => keys.reduce(konamiStep, 0);

it("completes on the full code", () => expect(feed(CODE)).toBe(10));
it("accepts capital B and A", () => expect(feed([...CODE.slice(0, 8), "B", "A"])).toBe(10));
it("resets on a wrong key", () => expect(feed(["ArrowUp", "ArrowUp", "x"])).toBe(0));
it("keeps a run of three ups alive", () => expect(feed(["ArrowUp", "ArrowUp", "ArrowUp", "ArrowDown"])).toBe(3));
it("ignores modifier keys, so Shift+B and Shift+A still count", () =>
  expect(feed([...CODE.slice(0, 8), "Shift", "B", "Shift", "A"])).toBe(10));
