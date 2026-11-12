"use client";

import { useEffect, useRef } from "react";

const GLYPHS = "01<>/\\{}[]();:=+*#%&!?_-|~^";
const BLOCKS = "░▒▓█";
const CELL_W = 13;
const CELL_H = 18;
const FRAME_MS = 85;

/**
 * The banner: a field of code glyphs that rots in drifting rust patches.
 * Moving the pointer over it burns a bright trail that slowly decays.
 */
export default function RotField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cols = 0;
    let rows = 0;
    let glyphs: string[] = [];
    let heat = new Float32Array(0);
    let raf = 0;
    let last = 0;
    let visible = true;
    let tear = { row: 0, span: 0, shift: 0, life: 0 };

    const pick = (set: string) => set[(Math.random() * set.length) | 0];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / CELL_W);
      rows = Math.ceil(height / CELL_H);
      glyphs = Array.from({ length: cols * rows }, () => pick(GLYPHS));
      heat = new Float32Array(cols * rows);
      draw(performance.now());
    };

    // Cheap drifting blobs: where this is high, the field has rotted.
    const rotAt = (x: number, y: number, t: number) =>
      Math.sin(x * 0.11 + t * 0.21) +
      Math.sin(y * 0.19 - t * 0.17) +
      Math.sin((x + y) * 0.07 + t * 0.11) +
      Math.sin(Math.hypot(x - cols * 0.7, y - rows * 0.4) * 0.16 - t * 0.3);

    const draw = (now: number) => {
      const t = now / 1000;
      const w = cols * CELL_W;
      const h = rows * CELL_H;
      ctx.clearRect(0, 0, w, h);
      ctx.font = `12px ui-monospace, "Cascadia Mono", Consolas, monospace`;
      ctx.textBaseline = "top";

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          if (!still && Math.random() < 0.012) glyphs[i] = pick(GLYPHS);
          const rot = rotAt(x, y, t);
          const hot = heat[i];
          const px = x * CELL_W;
          const py = y * CELL_H;

          if (hot > 0.04) {
            ctx.fillStyle = `rgba(198,255,61,${Math.min(1, hot)})`;
            ctx.fillText(hot > 0.6 ? pick(BLOCKS) : glyphs[i], px, py);
            heat[i] = hot * 0.9;
          } else if (rot > 2.1) {
            ctx.fillStyle = `rgba(255,90,42,${Math.min(0.85, (rot - 2.1) * 0.9 + 0.25)})`;
            ctx.fillText(BLOCKS[Math.min(3, ((rot - 2.1) * 4) | 0)], px, py);
          } else if (rot > 1.5) {
            ctx.fillStyle = "rgba(255,90,42,0.42)";
            ctx.fillText(glyphs[i], px, py);
          } else {
            const a = 0.07 + Math.max(0, rot + 1) * 0.045;
            ctx.fillStyle = `rgba(228,223,207,${a})`;
            ctx.fillText(glyphs[i], px, py);
          }
        }
      }

      // Occasionally shear a band sideways, like a bad tape read.
      if (!still) {
        if (tear.life <= 0 && Math.random() < 0.03) {
          tear = {
            row: (Math.random() * rows) | 0,
            span: 1 + ((Math.random() * 4) | 0),
            shift: (Math.random() - 0.5) * 90,
            life: 3 + ((Math.random() * 4) | 0),
          };
        }
        if (tear.life > 0) {
          const dpr = canvas.width / canvas.getBoundingClientRect().width;
          const sy = tear.row * CELL_H * dpr;
          const sh = tear.span * CELL_H * dpr;
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(canvas, 0, sy, canvas.width, sh, tear.shift * dpr, sy, canvas.width, sh);
          ctx.restore();
          tear.life--;
        }
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < FRAME_MS) return;
      last = now;
      draw(now);
    };

    const burn = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const cx = ((e.clientX - r.left) / CELL_W) | 0;
      const cy = ((e.clientY - r.top) / CELL_H) | 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
          const fall = 1 - Math.hypot(dx / 3, dy / 2) / 1.5;
          if (fall > 0 && Math.random() < 0.75) {
            const i = y * cols + x;
            heat[i] = Math.max(heat[i], fall);
          }
        }
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    const host = canvas.parentElement;
    if (!still) {
      host?.addEventListener("pointermove", burn);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      host?.removeEventListener("pointermove", burn);
    };
  }, []);

  return <canvas ref={ref} className="rot-field" aria-hidden="true" />;
}
