import { cacheLife } from "next/cache";

export type Day = { date: string; level: number; count: number };
export type Contributions = { days: Day[]; total: number; offset: number };
export type Language = { name: string; share: number };

const HEADERS = { "User-Agent": "resume-site", Accept: "text/html,application/json" };

/**
 * The last year of public contributions, read from the calendar GitHub
 * serves for profile pages. Returns null if GitHub can't be reached or the
 * markup changes, so the page can simply leave the section out.
 */
export async function getContributions(user: string): Promise<Contributions | null> {
  "use cache";
  cacheLife("hours");

  try {
    const res = await fetch(`https://github.com/users/${user}/contributions`, {
      headers: { ...HEADERS, "X-Requested-With": "XMLHttpRequest" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const counts = new Map<string, number>();
    for (const m of html.matchAll(
      /for="(contribution-day-component-\d+-\d+)"[^>]*>\s*(\d+|No) contributions?/g,
    )) {
      counts.set(m[1], m[2] === "No" ? 0 : Number(m[2]));
    }

    const days: Day[] = [];
    for (const m of html.matchAll(
      /data-date="(\d{4}-\d{2}-\d{2})" id="(contribution-day-component-\d+-\d+)" data-level="(\d)"/g,
    )) {
      days.push({ date: m[1], level: Number(m[3]), count: counts.get(m[2]) ?? 0 });
    }
    if (days.length < 300) return null;

    days.sort((a, b) => a.date.localeCompare(b.date));
    return {
      days,
      total: days.reduce((n, d) => n + d.count, 0),
      // Weekday of the first cell (0 = Sunday), so the grid starts on the right row.
      offset: new Date(`${days[0].date}T00:00:00Z`).getUTCDay(),
    };
  } catch {
    return null;
  }
}

/** Share of code by language across the user's own public repositories. */
export async function getLanguages(user: string): Promise<Language[] | null> {
  "use cache";
  cacheLife("hours");

  try {
    const res = await fetch(`https://api.github.com/users/${user}/repos?per_page=100&type=owner`, {
      headers: HEADERS,
    });
    if (!res.ok) return null;
    const repos: { languages_url: string; fork: boolean }[] = await res.json();

    const bytes = new Map<string, number>();
    await Promise.all(
      repos
        .filter((r) => !r.fork)
        .map(async (r) => {
          const lr = await fetch(r.languages_url, { headers: HEADERS });
          if (!lr.ok) return;
          const langs: Record<string, number> = await lr.json();
          for (const [name, n] of Object.entries(langs)) bytes.set(name, (bytes.get(name) ?? 0) + n);
        }),
    );

    const total = [...bytes.values()].reduce((a, b) => a + b, 0);
    if (!total) return null;

    const ranked = [...bytes].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, share: n / total }));
    const top = ranked.slice(0, 2);
    const rest = ranked.slice(2).reduce((n, l) => n + l.share, 0);
    return rest > 0 ? [...top, { name: "Other", share: rest }] : top;
  } catch {
    return null;
  }
}
