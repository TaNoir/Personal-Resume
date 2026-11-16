/** What the banner needs to know about the sky over Davao right now. */
export type SkyState = {
  /** Cloud cover, 0 (clear) to 1 (overcast). */
  cloud: number;
  rain: 0 | 1 | 2;
  night: boolean;
  /** Null until real weather has arrived. */
  tempC: number | null;
  label: string;
  /** Moon cycle, 0 = new, 0.5 = full. */
  moon: number;
};

const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86_400_000;
const DAVAO_UTC_OFFSET_H = 8;

const MOON_NAMES = [
  "new moon",
  "waxing crescent",
  "first quarter",
  "waxing gibbous",
  "full moon",
  "waning gibbous",
  "last quarter",
  "waning crescent",
];

export function moonCycle(date: Date): number {
  const cycles = (date.getTime() - KNOWN_NEW_MOON) / DAY_MS / SYNODIC_DAYS;
  return ((cycles % 1) + 1) % 1;
}

export function moonName(cycle: number): string {
  return MOON_NAMES[Math.round(cycle * 8) % 8];
}

/** Plain words for a WMO weather code. */
export function conditions(code: number): string {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly cloudy";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 95 && code <= 99) return "thunderstorm";
  return "cloudy";
}

const RAINY = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;

export function rainLevel(code: number, mm: number): 0 | 1 | 2 {
  if (mm >= 2.5 || code === 65 || code === 82 || (code >= 95 && code <= 99)) return 2;
  if (RAINY(code) || mm > 0) return 1;
  return 0;
}

/** Night in Davao is 18:00 to 05:59 local time. */
export function davaoNight(date: Date): boolean {
  const hour = (date.getUTCHours() + DAVAO_UTC_OFFSET_H) % 24;
  return hour >= 18 || hour < 6;
}

export function fallbackSky(date: Date): SkyState {
  return { cloud: 0.5, rain: 0, night: davaoNight(date), tempC: null, label: "", moon: moonCycle(date) };
}

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Reads an Open-Meteo "current" reply, or null if it isn't one. */
export function toSkyState(json: unknown, date: Date): SkyState | null {
  if (!json || typeof json !== "object") return null;
  const c = (json as { current?: Record<string, unknown> }).current;
  if (!c || typeof c !== "object") return null;
  const { temperature_2m: temp, cloud_cover: cover, weather_code: code, precipitation, is_day: isDay } = c;
  if (!num(temp) || !num(cover) || !num(code)) return null;
  const mm = num(precipitation) ? precipitation : 0;
  return {
    cloud: Math.min(1, Math.max(0, cover / 100)),
    rain: rainLevel(code, mm),
    night: num(isDay) ? isDay === 0 : davaoNight(date),
    tempC: temp,
    label: conditions(code),
    moon: moonCycle(date),
  };
}

export function caption(sky: SkyState): string | null {
  if (sky.tempC === null) return null;
  const parts = ["davao", `${sky.tempC.toFixed(1)}°C`, sky.label];
  if (sky.night) parts.push(moonName(sky.moon));
  return parts.join(" / ");
}
