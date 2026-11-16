import { describe, expect, it } from "vitest";
import { run } from "./terminal";

const ctx = { found: 2, sky: "davao / 25.8°C / overcast" };

describe("terminal", () => {
  it("lists commands in help but hides bark and sudo", () => {
    const text = run("help", ctx).lines.join("\n");
    for (const c of ["whoami", "stack", "project", "contact", "weather", "theme", "radio", "play", "secrets", "clear", "exit"])
      expect(text).toContain(c);
    expect(text).not.toContain("bark");
    expect(text).not.toContain("sudo");
  });
  it("answers the content commands from resume.ts", () => {
    expect(run("whoami", ctx).lines.join("\n")).toContain("Evander");
    expect(run("stack", ctx).lines.join("\n")).toContain("PowerShell");
    expect(run("project", ctx).lines.join("\n")).toContain("MobileOps Connect");
    expect(run("contact", ctx).lines.join("\n")).toContain("github.com/TaNoir");
  });
  it("is case-insensitive and trims", () => {
    expect(run("  HELP  ", ctx).lines).toEqual(run("help", ctx).lines);
  });
  it("drives the theme and radio", () => {
    expect(run("theme light", ctx).effects).toEqual([{ type: "theme", value: "light" }]);
    expect(run("theme purple", ctx).effects).toEqual([]);
    expect(run("theme purple", ctx).lines).toEqual(["usage: theme dark|light"]);
    expect(run("radio next", ctx).effects).toEqual([{ type: "radio", action: "next" }]);
    expect(run("radio", ctx).lines).toEqual(["usage: radio play|pause|next"]);
  });
  it("reports weather and secrets from context", () => {
    expect(run("weather", ctx).lines).toEqual(["davao / 25.8°C / overcast"]);
    expect(run("weather", { found: 0, sky: null }).lines).toEqual(["no signal from the sky."]);
    expect(run("secrets", ctx).lines).toEqual(["2/6 found. keep digging."]);
  });
  it("has hidden commands that are secrets", () => {
    expect(run("bark", ctx).effects).toEqual([{ type: "bark" }, { type: "secret", id: "bark" }]);
    const sudo = run("sudo rm -rf /", ctx);
    expect(sudo.lines).toEqual(["nice try. this incident will be reported to the dog."]);
    expect(sudo.effects).toEqual([{ type: "secret", id: "sudo" }]);
  });
  it("handles play, clear and exit", () => {
    expect(run("play", ctx).effects).toEqual([{ type: "play" }, { type: "close" }]);
    expect(run("clear", ctx).effects).toEqual([{ type: "clear" }]);
    expect(run("exit", ctx).effects).toEqual([{ type: "close" }]);
  });
  it("survives odd input", () => {
    expect(run("", ctx)).toEqual({ lines: [], effects: [] });
    expect(run("    ", ctx)).toEqual({ lines: [], effects: [] });
    expect(run("<img src=x onerror=alert(1)>", ctx).lines).toEqual(["command not found: <img"]);
    const long = run("x".repeat(5000), ctx).lines[0];
    expect(long.length).toBeLessThanOrEqual("command not found: ".length + 200);
  });
});
