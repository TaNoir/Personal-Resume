"use client";

import { useEffect, useRef } from "react";
import { fallbackSky, type SkyState } from "@/lib/sky";

const W = 304;
const H = 171;
const FRAME_MS = 110;

// 4x4 ordered-dither thresholds, 0..1.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const STARS = [
  { x: 0.2, y: 0.36, r: 0.3, phase: 0 },
  { x: 0.63, y: 0.62, r: 0.42, phase: 1.7 },
  { x: 0.87, y: 0.22, r: 0.16, phase: 3.1 },
  { x: 0.4, y: 0.84, r: 0.12, phase: 4.4 },
];

// The moon hangs top-centre, clear of the stars' arms.
const MOON = { x: 0.5, y: 0.27, r: 0.11 };

// [cloud, mid-tone, ground] for each theme. In light mode the sky is
// printed in ink on paper instead of lit on black.
const NIGHT = [[220, 234, 255], [52, 110, 222], [9, 9, 11]];
const PAPER = [[16, 16, 20], [47, 95, 214], [232, 230, 224]];

/**
 * The banner art: a low-resolution sky of drifting cloud, crushed to three
 * tones with ordered dithering and punched through with four-point stars.
 * The cloud thickens wherever the pointer is.
 *
 * `sky` is the real weather over Davao: it sets how cloudy it is, whether it
 * rains, and whether it is night (stars and the moon at its real phase) or
 * day (one big star left as the sun). Until it arrives, a plain sky is drawn.
 */
export default function DitherSky({ sky }: { sky: SkyState | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const skyRef = useRef<SkyState | null>(sky);
  const redraw = useRef<(() => void) | null>(null);

  useEffect(() => {
    skyRef.current = sky;
    redraw.current?.();
  }, [sky]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const image = ctx.createImageData(W, H);
    const px = image.data;

    // Fixed lattice of random values so the sky is the same on every visit.
    const lattice = new Float32Array(65536);
    let seed = 20261112;
    for (let i = 0; i < lattice.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      lattice[i] = seed / 4294967296;
    }
    const at = (x: number, y: number) => lattice[(x & 255) + ((y & 255) << 8)];
    const noise = (x: number, y: number) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const fx = x - xi;
      const fy = y - yi;
      const u = fx * fx * (3 - 2 * fx);
      const v = fy * fy * (3 - 2 * fy);
      const top = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * u;
      const bottom = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * u;
      return top + (bottom - top) * v;
    };
    const cloud = (x: number, y: number) =>
      noise(x, y) * 0.5 + noise(x * 2.1, y * 2.1) * 0.27 + noise(x * 4.3, y * 4.3) * 0.15 + noise(x * 9, y * 9) * 0.08;

    const pointer = { x: -1, y: -1 };
    let raf = 0;
    let last = 0;
    let visible = true;
    const plain = fallbackSky(new Date());

    const draw = (now: number) => {
      const t = now / 1000;
      const sky = skyRef.current ?? plain;
      const stars = sky.night ? STARS : [STARS[1]];
      const moonX = MOON.x * W;
      const moonY = MOON.y * H;
      const moonR = MOON.r * H;
      const phase = Math.cos(2 * Math.PI * sky.moon);
      const rainEvery = sky.rain === 2 ? 9 : 17;
      const rainT = (t * 90) | 0;
      const rainDash = (t * 60) | 0;
      const [PALE, BLUE, DARK] = document.documentElement.dataset.theme === "light" ? PAPER : NIGHT;
      const tearRow = !still && Math.random() < 0.12 ? (Math.random() * H) | 0 : -1;
      const tearShift = ((Math.random() - 0.5) * 36) | 0;

      for (let y = 0; y < H; y++) {
        const shift = tearRow >= 0 && y >= tearRow && y < tearRow + 5 ? tearShift : 0;
        for (let x = 0; x < W; x++) {
          const sx = x + shift;
          let v = cloud(sx * 0.02 + t * 0.045, y * 0.034 + t * 0.012);
          v = (v - 0.34) * 2.3 + (y / H) * 0.22;
          v += (sky.cloud - 0.5) * 0.5;

          if (pointer.x >= 0) {
            const d = Math.hypot(sx - pointer.x, (y - pointer.y) * 1.15);
            if (d < 46) v += (1 - d / 46) * 0.5;
          }

          let tone = DARK;
          const edge = BAYER[(x & 3) + ((y & 3) << 2)];
          if (v > edge * 0.7 + 0.42) tone = PALE;
          else if (v > edge * 0.7 + 0.08) tone = BLUE;

          // The moon, lit on the side its real phase says. A thin rim keeps a
          // new moon visible as a ring.
          if (sky.night) {
            const dx = (sx - moonX) / moonR;
            const dy = (y - moonY) / moonR;
            const d2 = dx * dx + dy * dy;
            if (d2 < 1) {
              const edge = Math.sqrt(1 - dy * dy);
              const lit = sky.moon <= 0.5 ? dx > phase * edge : dx < -phase * edge;
              tone = lit || d2 > 0.8 ? PALE : DARK;
            }
          }

          // Astroid test: |dx|^.5 + |dy|^.5 < r^.5 is a concave four-point star.
          for (const s of stars) {
            const r = s.r * H * (1 + Math.sin(t * 0.6 + s.phase) * 0.06);
            const reach =
              (Math.sqrt(Math.abs(sx - s.x * W)) + Math.sqrt(Math.abs(y - s.y * H))) / Math.sqrt(r);
            if (reach < 1) {
              tone = DARK;
              break;
            }
            if (reach < 1.045) {
              tone = PALE;
              break;
            }
          }

          // Rain: slanted dashes that slide down and left, in front of
          // everything, pale on dark and blue on pale cloud.
          if (
            sky.rain > 0 &&
            (((x + y * 0.5 + rainT) | 0) % rainEvery) === 0 &&
            ((y * 3 + x + rainDash) & 7) < 3
          ) {
            tone = tone === PALE ? BLUE : PALE;
          }

          const i = (y * W + x) * 4;
          px[i] = tone[0];
          px[i + 1] = tone[1];
          px[i + 2] = tone[2];
          px[i + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < FRAME_MS) return;
      last = now;
      draw(now);
    };

    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * W;
      pointer.y = ((e.clientY - r.top) / r.height) * H;
    };
    const leave = () => {
      pointer.x = -1;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    draw(0);
    redraw.current = () => draw(still ? 0 : performance.now());
    if (!still) {
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerleave", leave);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      redraw.current = null;
      cancelAnimationFrame(raf);
      io.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <canvas ref={ref} width={W} height={H} className="sky" aria-hidden="true" />;
}
