"use client";

import { useEffect, useRef } from "react";
import { NIGHT, PAPER } from "@/components/DitherSky";
import {
  CHIMNEY_H,
  CHIMNEY_W,
  DOG_H,
  DOG_W,
  DOG_X,
  ROOF_Y,
  VIEW_H,
  VIEW_W,
  newGame,
  parseBest,
  score,
  step,
  type Game,
} from "@/lib/runner";

const BEST_KEY = "runner-best";
const SHAKE_MS = 200;

// A few fixed four-point stars in the sky behind the roofs.
const STARS = [
  [34, 18],
  [102, 34],
  [151, 12],
  [214, 28],
  [287, 16],
  [262, 52],
];

const pad = (n: number) => String(n).padStart(4, "0");

function readBest(): number {
  try {
    return parseBest(localStorage.getItem(BEST_KEY));
  } catch {
    return 0;
  }
}

/** The dog's picture squeezed to an 18 x 16 one-bit mask. */
function loadSprite(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = DOG_W;
      c.height = DOG_H;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, DOG_W, DOG_H);
      const px = ctx.getImageData(0, 0, DOG_W, DOG_H).data;
      const mask = new Uint8Array(DOG_W * DOG_H);
      for (let i = 0; i < mask.length; i++) mask[i] = px[i * 4 + 3] > 128 ? 1 : 0;
      resolve(mask);
    };
    img.onerror = () => resolve(null);
    img.src = "/dog.png";
  });
}

/**
 * "Dog on the roof": a one-bit endless runner in a window of its own.
 * Space, the up arrow, a click or a tap jumps. Opened by the banner's play
 * button or the terminal's `play` command.
 */
export default function DogRunner() {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scoreText = useRef<HTMLSpanElement>(null);
  const bestText = useRef<HTMLSpanElement>(null);
  const message = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const d = dialog.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!d || !cv || !ctx) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let game: Game = newGame(Date.now() % 100_000);
    let best = 0;
    let jump = false;
    let raf = 0;
    let last = 0;
    let sprite: Uint8Array | null = null;
    let spriteAsked = false;

    const say = (text: string) => {
      if (message.current) message.current.textContent = text;
    };

    const hud = () => {
      if (scoreText.current) scoreText.current.textContent = `SCORE ${pad(score(game))}`;
      if (bestText.current) bestText.current.textContent = `BEST ${pad(best)}`;
    };

    const draw = () => {
      const [PALE, BLUE, DARK] = document.documentElement.dataset.theme === "light" ? PAPER : NIGHT;
      const rgb = (c: number[]) => `rgb(${c[0]} ${c[1]} ${c[2]})`;
      ctx.fillStyle = rgb(DARK);
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      ctx.fillStyle = rgb(BLUE);
      for (const [x, y] of STARS) {
        ctx.fillRect(x - 2, y, 5, 1);
        ctx.fillRect(x, y - 2, 1, 5);
      }

      for (const r of game.roofs) {
        const x = Math.round(r.x);
        const w = Math.round(r.w);
        if (x > VIEW_W || x + w < 0) continue;
        // Pale ledge, then a dithered wall down to the bottom.
        ctx.fillStyle = rgb(PALE);
        ctx.fillRect(x, ROOF_Y, w, 3);
        ctx.fillStyle = rgb(BLUE);
        for (let y = ROOF_Y + 3; y < VIEW_H; y++) {
          for (let px = x + ((y + x) & 1); px < x + w; px += 2) ctx.fillRect(px, y, 1, 1);
        }
        ctx.fillStyle = rgb(PALE);
        for (const c of r.chimneys) ctx.fillRect(Math.round(r.x + c), ROOF_Y - CHIMNEY_H, CHIMNEY_W, CHIMNEY_H);
      }

      const top = Math.round(game.dogY) - DOG_H;
      ctx.fillStyle = rgb(PALE);
      if (sprite) {
        for (let y = 0; y < DOG_H; y++) {
          for (let x = 0; x < DOG_W; x++) if (sprite[y * DOG_W + x]) ctx.fillRect(DOG_X + x, top + y, 1, 1);
        }
      } else {
        ctx.fillRect(DOG_X, top, DOG_W, DOG_H);
      }
      // Two scrambling legs while it runs on a roof.
      if (game.status === "running" && game.grounded) {
        const stride = Math.floor(game.distance / 6) & 1;
        ctx.fillRect(DOG_X + 4 + stride * 2, top + DOG_H - 1, 2, 1);
        ctx.fillRect(DOG_X + 12 - stride * 2, top + DOG_H - 1, 2, 1);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) {
        last = 0;
        return;
      }
      const dt = last ? now - last : 0;
      last = now;
      const before = game.status;
      game = step(game, dt, jump);
      jump = false;

      if (before !== "running" && game.status === "running") say("");
      if (before === "running" && game.status === "over") {
        const s = score(game);
        if (s > best) {
          best = s;
          try {
            localStorage.setItem(BEST_KEY, String(best));
          } catch {}
        }
        say(`GAME OVER · ${s} · jump to retry`);
        if (!calm) {
          cv.classList.add("is-shaking");
          setTimeout(() => cv.classList.remove("is-shaking"), SHAKE_MS);
        }
      }
      hud();
      draw();
    };

    const open = () => {
      if (d.open) return;
      if (!spriteAsked) {
        spriteAsked = true;
        void loadSprite().then((mask) => {
          sprite = mask;
          draw();
        });
      }
      best = readBest();
      game = newGame(Date.now() % 100_000);
      jump = false;
      last = 0;
      say("press space or tap to start");
      hud();
      d.showModal();
      cv.focus();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    };

    const stop = () => cancelAnimationFrame(raf);

    const key = (e: KeyboardEvent) => {
      if (!d.open || (e.key !== " " && e.key !== "ArrowUp")) return;
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      if (!e.repeat) jump = true;
    };

    const tap = (e: PointerEvent) => {
      e.preventDefault();
      jump = true;
    };

    window.addEventListener("rot:play", open);
    window.addEventListener("keydown", key);
    cv.addEventListener("pointerdown", tap);
    d.addEventListener("close", stop);
    return () => {
      stop();
      window.removeEventListener("rot:play", open);
      window.removeEventListener("keydown", key);
      cv.removeEventListener("pointerdown", tap);
      d.removeEventListener("close", stop);
    };
  }, []);

  return (
    <dialog ref={dialog} className="runner" aria-label="Dog on the roof, a mini game">
      <div className="term-bar">
        <span>dog_on_the_roof.exe</span>
        <button
          type="button"
          className="term-x"
          onClick={() => dialog.current?.close()}
          aria-label="Close game"
        >
          ×
        </button>
      </div>
      <div className="runner-stage">
        <p className="runner-hud" aria-hidden="true">
          <span ref={scoreText}>SCORE 0000</span>
          <span ref={bestText}>BEST 0000</span>
        </p>
        <canvas
          ref={canvas}
          width={VIEW_W}
          height={VIEW_H}
          tabIndex={0}
          aria-label="Game screen. Press space or tap to jump."
        />
        <p ref={message} className="runner-msg" aria-live="polite" />
      </div>
      <p className="runner-hint">space / tap to jump · esc to quit</p>
    </dialog>
  );
}
