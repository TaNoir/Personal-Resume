"use client";

import { useSyncExternalStore } from "react";

const subscribe = (notify: () => void) => {
  const id = setInterval(notify, 1000);
  return () => clearInterval(id);
};

/** Live wall-clock time in a fixed time zone, whatever the visitor's own. */
export default function Clock({ timeZone, seconds = true }: { timeZone: string; seconds?: boolean }) {
  const time = useSyncExternalStore(
    subscribe,
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: seconds ? "2-digit" : undefined,
        hour12: false,
      }).format(new Date()),
    () => "",
  );

  return (
    <time className="clock" suppressHydrationWarning>
      {time || (seconds ? "--:--:--" : "--:--")}
    </time>
  );
}
