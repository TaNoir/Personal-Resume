import { resume } from "@/content/resume";
import { SECRET_IDS, type SecretId } from "@/lib/secrets";

/** Something the terminal asks the page to do after printing. */
export type Effect =
  | { type: "theme"; value: "dark" | "light" }
  | { type: "radio"; action: "play" | "pause" | "next" }
  | { type: "bark" }
  | { type: "play" }
  | { type: "clear" }
  | { type: "close" }
  | { type: "secret"; id: SecretId };

export type Ctx = { found: number; sky: string | null };
export type Result = { lines: string[]; effects: Effect[] };

/** Longest input the terminal reads; anything after is ignored. */
export const MAX_INPUT = 200;

const HELP = [
  "commands:",
  "  whoami              who runs this place",
  "  stack               what I build with",
  "  project             my projects",
  "  contact             how to reach me",
  "  weather             the sky over davao",
  "  theme dark|light    flip the lights",
  "  radio play|pause|next",
  "  play                dog on the roof",
  "  secrets             how many you've found",
  "  clear               wipe the screen",
  "  exit                close the terminal",
];

const say = (...lines: string[]): Result => ({ lines, effects: [] });
const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/**
 * Runs one line typed into the terminal. Pure: it only describes what to
 * print and what the page should do, so it can be tested on its own.
 */
export function run(input: string, ctx: Ctx): Result {
  const words = input.slice(0, MAX_INPUT).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return say();
  const [first, ...rest] = words;
  const cmd = first.toLowerCase();
  const arg = rest[0]?.toLowerCase();

  switch (cmd) {
    case "help":
      return say(...HELP);
    case "whoami":
      return say(
        `${resume.name} (${resume.handle})`,
        `${resume.title}, ${resume.location}.`,
        `${resume.education.status} ${resume.education.degree}, ${resume.education.school}.`,
        `${resume.status.toLowerCase()}.`,
      );
    case "stack":
      return say(...resume.stack.map((g) => `${g.group.padEnd(15)}${g.items.join(", ")}`));
    case "project":
    case "projects":
      return say(
        ...resume.projects.flatMap((p, i) => [
          ...(i ? [""] : []),
          `${p.name} (${p.year})`,
          p.blurb,
          bare(p.url),
        ]),
      );
    case "contact":
      return say(
        ...resume.emails.map((e) => `${e.label.padEnd(10)}${e.address}`),
        ...resume.links.map((l) => `${l.label.toLowerCase().padEnd(10)}${bare(l.href)}`),
      );
    case "weather":
      return say(ctx.sky ?? "no signal from the sky.");
    case "theme":
      if (arg === "dark" || arg === "light") {
        return { lines: [`lights: ${arg}.`], effects: [{ type: "theme", value: arg }] };
      }
      return say("usage: theme dark|light");
    case "radio":
      if (arg === "play" || arg === "pause" || arg === "next") {
        return { lines: [`radio: ${arg}.`], effects: [{ type: "radio", action: arg }] };
      }
      return say("usage: radio play|pause|next");
    case "play":
      return { lines: ["loading dog_on_the_roof.exe ..."], effects: [{ type: "play" }, { type: "close" }] };
    case "secrets":
      return say(
        ctx.found >= SECRET_IDS.length
          ? `${ctx.found}/${SECRET_IDS.length} found. good dog.`
          : `${ctx.found}/${SECRET_IDS.length} found. keep digging.`,
      );
    case "clear":
      return { lines: [], effects: [{ type: "clear" }] };
    case "exit":
      return { lines: [], effects: [{ type: "close" }] };
    // Not in help. Finding them is the point.
    case "bark":
      return { lines: ["WOOF."], effects: [{ type: "bark" }, { type: "secret", id: "bark" }] };
    case "sudo":
      return {
        lines: ["nice try. this incident will be reported to the dog."],
        effects: [{ type: "secret", id: "sudo" }],
      };
    default:
      return say(`command not found: ${first}`);
  }
}
