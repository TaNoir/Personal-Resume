"use client";

import { useEffect, useState } from "react";
import DitherSky from "@/components/DitherSky";
import { caption, fallbackSky, toSkyState, type SkyState } from "@/lib/sky";

const WEATHER =
  "https://api.open-meteo.com/v1/forecast?latitude=7.07&longitude=125.61" +
  "&current=temperature_2m,cloud_cover,precipitation,weather_code,is_day&timezone=Asia%2FManila";
const TIMEOUT_MS = 6000;

/**
 * The banner: the dithered sky, fed with the real weather over Davao when it
 * can be fetched, and the caption underneath it. If the weather never
 * arrives the sky still runs on the clock and the moon.
 */
export default function SkyBanner({ handle }: { handle: string }) {
  const [sky, setSky] = useState<SkyState | null>(null);

  useEffect(() => {
    let gone = false;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);

    fetch(WEATHER, { signal: abort.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => toSkyState(json, new Date()))
      .catch(() => null)
      .then((live) => {
        clearTimeout(timer);
        if (!gone) setSky(live ?? fallbackSky(new Date()));
      });

    return () => {
      gone = true;
      clearTimeout(timer);
      abort.abort();
    };
  }, []);

  const live = sky && caption(sky);

  return (
    <figure className="banner">
      <DitherSky sky={sky} />
      <figcaption aria-hidden="true">
        <span>{live || `sky.raw / 1-bit / ${handle}`}</span>
        <span lang="ja">エヴァンダー</span>
      </figcaption>
    </figure>
  );
}
