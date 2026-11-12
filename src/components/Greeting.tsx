"use client";

import { useEffect, useRef } from "react";

// English, Filipino, Bisaya, Japanese.
const WORDS = ["Hey there", "Kumusta", "Maayong adlaw", "こんにちは"];

const NOISE = "#%&$@!?<>/\\[]{}=+*01";
const HOLD_MS = 2800;

/**
 * Hello in the languages around me. Each word corrupts into noise and
 * resolves into the next one. Screen readers just hear "Hey there".
 *
 * The word itself is written straight into the DOM by the effect (React only
 * ever renders the first one), so the scramble never fights React's render.
 */
export default function Greeting() {
  const word = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let index = 0;
    let scramble: ReturnType<typeof setInterval> | undefined;

    const timer = setInterval(() => {
      index = (index + 1) % WORDS.length;
      const target = Array.from(WORDS[index]);

      let step = 0;
      clearInterval(scramble);
      scramble = setInterval(() => {
        step += 0.5;
        if (word.current) {
          word.current.textContent = target
            .map((ch, i) => (i < step || ch === " " ? ch : NOISE[(Math.random() * NOISE.length) | 0]))
            .join("");
        }
        if (step >= target.length) clearInterval(scramble);
      }, 32);
    }, HOLD_MS);

    return () => {
      clearInterval(timer);
      clearInterval(scramble);
    };
  }, []);

  return (
    <p className="greet">
      <span className="sr-only">Hey there.</span>
      <span aria-hidden="true">
        <span ref={word} className="greet-word">
          {WORDS[0]}
        </span>
      </span>
    </p>
  );
}
