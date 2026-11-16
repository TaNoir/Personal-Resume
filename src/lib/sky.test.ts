import { describe, expect, it } from "vitest";
import { caption, conditions, davaoNight, fallbackSky, moonCycle, moonName, rainLevel, toSkyState } from "./sky";

describe("moon", () => {
  it("is new on 2024-01-11 and full on 2024-01-25", () => {
    const n = moonCycle(new Date("2024-01-11T11:57:00Z"));
    expect(Math.min(n, 1 - n)).toBeLessThan(0.03);
    expect(Math.abs(moonCycle(new Date("2024-01-25T17:54:00Z")) - 0.5)).toBeLessThan(0.03);
  });
  it("names the eight phases", () => {
    expect(moonName(0)).toBe("new moon");
    expect(moonName(0.125)).toBe("waxing crescent");
    expect(moonName(0.25)).toBe("first quarter");
    expect(moonName(0.375)).toBe("waxing gibbous");
    expect(moonName(0.5)).toBe("full moon");
    expect(moonName(0.625)).toBe("waning gibbous");
    expect(moonName(0.75)).toBe("last quarter");
    expect(moonName(0.875)).toBe("waning crescent");
    expect(moonName(0.99)).toBe("new moon");
  });
});

describe("weather", () => {
  it("maps WMO codes", () => {
    expect(conditions(0)).toBe("clear");
    expect(conditions(2)).toBe("partly cloudy");
    expect(conditions(3)).toBe("overcast");
    expect(conditions(48)).toBe("fog");
    expect(conditions(53)).toBe("drizzle");
    expect(conditions(63)).toBe("rain");
    expect(conditions(81)).toBe("rain");
    expect(conditions(96)).toBe("thunderstorm");
    expect(conditions(71)).toBe("cloudy");
  });
  it("grades rain", () => {
    expect(rainLevel(3, 0)).toBe(0);
    expect(rainLevel(61, 0.4)).toBe(1);
    expect(rainLevel(3, 0.2)).toBe(1);
    expect(rainLevel(61, 2.5)).toBe(2);
    expect(rainLevel(65, 0)).toBe(2);
    expect(rainLevel(95, 0)).toBe(2);
  });
  it("knows Davao night is 18:00 to 05:59 local (UTC+8)", () => {
    expect(davaoNight(new Date("2026-11-16T10:00:00Z"))).toBe(true); // 18:00
    expect(davaoNight(new Date("2026-11-16T21:59:00Z"))).toBe(true); // 05:59
    expect(davaoNight(new Date("2026-11-16T22:00:00Z"))).toBe(false); // 06:00
    expect(davaoNight(new Date("2026-11-16T09:59:00Z"))).toBe(false); // 17:59
  });
  it("reads an Open-Meteo reply", () => {
    const at = new Date("2026-11-16T10:30:00Z");
    const sky = toSkyState(
      { current: { temperature_2m: 25.8, cloud_cover: 100, precipitation: 0, weather_code: 3, is_day: 0 } },
      at,
    );
    expect(sky).toMatchObject({ cloud: 1, rain: 0, night: true, tempC: 25.8, label: "overcast" });
    expect(caption(sky!)).toBe(`davao / 25.8°C / overcast / ${moonName(sky!.moon)}`);
  });
  it("leaves the moon out of the caption by day", () => {
    const sky = toSkyState(
      { current: { temperature_2m: 31, cloud_cover: 20, precipitation: 0, weather_code: 1, is_day: 1 } },
      new Date("2026-11-16T04:00:00Z"),
    );
    expect(caption(sky!)).toBe("davao / 31.0°C / partly cloudy");
  });
  it("rejects bad replies and falls back", () => {
    expect(toSkyState({}, new Date())).toBeNull();
    expect(toSkyState(null, new Date())).toBeNull();
    expect(toSkyState({ current: { temperature_2m: "hot" } }, new Date())).toBeNull();
    const f = fallbackSky(new Date("2026-11-16T10:00:00Z"));
    expect(f).toMatchObject({ cloud: 0.5, rain: 0, night: true, tempC: null });
    expect(caption(f)).toBeNull();
  });
});
