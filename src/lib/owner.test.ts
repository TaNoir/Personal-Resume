import { afterEach, describe, expect, it } from "vitest";
import { isOwner } from "./owner";

const req = (token?: string) =>
  new Request("https://example.test/api/owner", {
    method: "POST",
    headers: token === undefined ? {} : { "x-wall-token": token },
  });

describe("owner check", () => {
  afterEach(() => {
    delete process.env.WALL_ADMIN_TOKEN;
  });
  it("accepts only the configured token", () => {
    process.env.WALL_ADMIN_TOKEN = "s3cret-token";
    expect(isOwner(req("s3cret-token"))).toBe(true);
    expect(isOwner(req("s3cret-tokeN"))).toBe(false);
    expect(isOwner(req("s3cret"))).toBe(false);
    expect(isOwner(req())).toBe(false);
  });
  it("lets nobody in when no token is configured", () => {
    expect(isOwner(req(""))).toBe(false);
    expect(isOwner(req("anything"))).toBe(false);
  });
});
