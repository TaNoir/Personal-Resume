import { expect, it } from "vitest";
import { SECRET_IDS, addSecret, parseSecrets } from "./secrets";

it("has six secrets", () => expect(SECRET_IDS).toHaveLength(6));

it("parses stored secrets defensively", () => {
  expect(parseSecrets(null)).toEqual([]);
  expect(parseSecrets("not json")).toEqual([]);
  expect(parseSecrets('{"a":1}')).toEqual([]);
  expect(parseSecrets('["konami","nope",3,"konami","bite"]')).toEqual(["konami", "bite"]);
});

it("adds a secret once", () => {
  const one = addSecret([], "bark");
  expect(one).toEqual(["bark"]);
  expect(addSecret(one, "bark")).toBe(one);
});
