"use client";

import { useState } from "react";

/** Copies a value to the clipboard and confirms it in place. */
export default function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState("done");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1800);
  };

  return (
    <button type="button" className="copy" onClick={copy} aria-label={`Copy ${label}`}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <rect x="5.5" y="5.5" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 3V2.5h-8v8H3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span aria-live="polite">
        {state === "done" ? "copied" : state === "failed" ? "select it instead" : "copy"}
      </span>
    </button>
  );
}
