"use client";

import { useEffect, useRef, useState } from "react";
import { konamiStep } from "@/lib/konami";
import { SECRET_IDS, findSecret } from "@/lib/secrets";

const TOAST_MS = 3000;
const ROT_MS = 4000;
const BARK_MS = 1300;
const BITE_MS = 700;
const BITE_CLICKS = 5;
const BITE_WINDOW_MS = 2000;

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** Adds a class for a while, restarting it if it is already there. */
function flash(el: Element | null, name: string, ms: number) {
  if (!el) return;
  el.classList.remove(name);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(name);
  setTimeout(() => el.classList.remove(name), ms);
}

declare global {
  interface Window {
    rot?: () => string;
  }
}

/**
 * The site's hidden layer: the Konami code, the dog that bites when poked too
 * often, the bark the terminal asks for, a note for people who open the
 * console, and the toast that announces each secret as it is found.
 */
export default function Secrets() {
  const [toast, setToast] = useState<string | null>(null);
  const slot = useRef<HTMLDivElement>(null);

  // The toast lives in the browser's top layer (a popover), so it shows above
  // the terminal or the game when a secret is found inside one of them.
  // Re-showing it moves it above anything opened since.
  useEffect(() => {
    const el = slot.current;
    if (!el || typeof el.showPopover !== "function") return;
    try {
      if (el.matches(":popover-open")) el.hidePopover();
      if (toast) el.showPopover();
    } catch {
      // Not connected yet, or already in the wanted state.
    }
  }, [toast]);

  useEffect(() => {
    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    let rotTimer: ReturnType<typeof setTimeout> | undefined;
    let konami = 0;
    let clicks: number[] = [];
    const root = document.documentElement;
    const avatar = () => document.querySelector(".avatar");

    const found = (e: Event) => {
      const { id, count } = (e as CustomEvent<{ id: string; count: number }>).detail ?? {};
      if (!id) return;
      setToast(`secret found ${count}/${SECRET_IDS.length}: ${id}`);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setToast(null), TOAST_MS);
    };

    const key = (e: KeyboardEvent) => {
      // Arrow keys aimed at the game or terminal don't count.
      if (typing(e.target) || document.querySelector("dialog[open]")) return;
      konami = konamiStep(konami, e.key);
      if (konami < 10) return;
      konami = 0;
      root.dataset.rot = "";
      clearTimeout(rotTimer);
      rotTimer = setTimeout(() => delete root.dataset.rot, ROT_MS);
      findSecret("konami");
    };

    const bark = () => flash(avatar(), "is-barking", BARK_MS);

    // Five pokes in two seconds and it goes for the pointer.
    const poke = (e: MouseEvent) => {
      const box = (e.target as Element | null)?.closest?.(".avatar");
      if (!box) return;
      const now = performance.now();
      clicks = [...clicks.filter((t) => now - t < BITE_WINDOW_MS), now];
      if (clicks.length < BITE_CLICKS) return;
      clicks = [];
      const r = box.getBoundingClientRect();
      const el = box as HTMLElement;
      el.style.setProperty("--bx", `${(e.clientX - (r.left + r.width / 2)) * 0.4}px`);
      el.style.setProperty("--by", `${(e.clientY - (r.top + r.height / 2)) * 0.4}px`);
      flash(box, "is-biting", BITE_MS);
      findSecret("bite");
    };

    console.log(
      "%c null.rot %c you opened the hood. call rot() to claim a secret.",
      "background:#dceaff;color:#09090b;padding:2px 6px;font-family:monospace",
      "color:#5b9bff;font-family:monospace",
    );
    window.rot = () => (findSecret("console") ? "claimed." : "already yours.");

    window.addEventListener("rot:secret", found);
    window.addEventListener("rot:bark", bark);
    window.addEventListener("keydown", key);
    document.addEventListener("click", poke);
    return () => {
      window.removeEventListener("rot:secret", found);
      window.removeEventListener("rot:bark", bark);
      window.removeEventListener("keydown", key);
      document.removeEventListener("click", poke);
      clearTimeout(toastTimer);
      clearTimeout(rotTimer);
      delete root.dataset.rot;
      delete window.rot;
    };
  }, []);

  return (
    <>
      <p className="sr-only" role="status">
        {toast}
      </p>
      <div ref={slot} className="toast-slot" popover="manual" aria-hidden="true">
        {toast && (
          <p key={toast} className="toast">
            <span>✦</span> {toast}
          </p>
        )}
      </div>
    </>
  );
}
