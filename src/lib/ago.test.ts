import { expect, it } from "vitest";
import { ago } from "./ago";

it("formats relative time", () => {
  const now = new Date("2026-11-16T12:00:00Z");
  expect(ago("2026-11-16T11:59:40Z", now)).toBe("just now");
  expect(ago("2026-11-16T11:15:00Z", now)).toBe("45m ago");
  expect(ago("2026-11-16T09:00:00Z", now)).toBe("3h ago");
  expect(ago("2026-11-13T12:00:00Z", now)).toBe("3d ago");
  expect(ago("2026-08-16T12:00:00Z", now)).toBe("3mo ago");
  expect(ago("2026-11-17T12:00:00Z", now)).toBe("just now"); // clock skew
  expect(ago("nonsense", now)).toBe("");
});
