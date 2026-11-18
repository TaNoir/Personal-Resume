"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { findSecret, useSecrets } from "@/lib/secrets";
import { MAX_INPUT, run, type Effect } from "@/lib/terminal";
import { setTheme } from "@/lib/theme";

const MAX_LINES = 200;

type Line = { id: number; text: string; echo?: boolean };

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

const send = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));

/** A mouse and a keyboard: the terminal is a desktop-only secret. */
export const DESKTOP = "(hover: hover) and (pointer: fine)";

/**
 * A small fake shell. Opens with the backtick key or the footer button, on
 * desktops only, centred, and can be dragged by its title bar.
 * Everything it prints is plain text.
 */
export default function Terminal() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const greeted = useRef(false);
  const history = useRef<string[]>([]);
  const recall = useRef(-1);
  const [lines, setLines] = useState<Line[]>([]);
  const found = useSecrets().length;
  // Where the window has been dragged to, from the centre.
  const offset = useRef({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; x: number; y: number; box: DOMRect } | null>(null);
  const dragged = useRef(false);

  const place = (x: number, y: number) => {
    offset.current = { x, y };
    if (dialog.current) dialog.current.style.translate = x || y ? `${x}px ${y}px` : "";
  };

  const print = (texts: string[], echo = false) => {
    if (!texts.length) return;
    setLines((old) =>
      [...old, ...texts.map((text) => ({ id: nextId.current++, text, echo }))].slice(-MAX_LINES),
    );
  };

  const open = () => {
    const d = dialog.current;
    if (!d || d.open || !window.matchMedia(DESKTOP).matches) return;
    place(0, 0);
    d.showModal();
    input.current?.focus();
    if (!greeted.current) {
      greeted.current = true;
      print(["null.rot shell. type 'help'."]);
    }
    findSecret("terminal");
  };

  // Kept in a ref so the window listeners, added once, always call the latest.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });

  useEffect(() => {
    const fromButton = () => openRef.current();
    const fromKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "`" || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      // Not on top of another window, such as the game.
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault();
      openRef.current();
    };
    window.addEventListener("rot:terminal", fromButton);
    window.addEventListener("keydown", fromKey);
    return () => {
      window.removeEventListener("rot:terminal", fromButton);
      window.removeEventListener("keydown", fromKey);
    };
  }, []);

  // Keep the newest line in view.
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const apply = (effect: Effect) => {
    switch (effect.type) {
      case "theme":
        return setTheme(effect.value);
      case "radio":
        return send("rot:radio", effect.action);
      case "bark":
        return send("rot:bark");
      case "play":
        return send("rot:play");
      case "secret":
        return void findSecret(effect.id);
      case "clear":
        return setLines([]);
      case "close":
        return dialog.current?.close();
    }
  };

  const submit = () => {
    const el = input.current;
    if (!el) return;
    const text = el.value;
    el.value = "";
    recall.current = -1;
    if (!text.trim()) return;
    history.current = [text, ...history.current].slice(0, 50);
    print([`> ${text}`], true);
    const result = run(text, { found, sky: document.documentElement.dataset.sky ?? null });
    print(result.lines);
    result.effects.forEach(apply);
  };

  // Drag by the title bar, kept inside the window.
  const grab = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as Element).closest("button") || !dialog.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const box = dialog.current.getBoundingClientRect();
    drag.current = { px: e.clientX, py: e.clientY, ...offset.current, box };
    dragged.current = false;
    dialog.current.classList.add("is-dragging");
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g) return;
    const dx = Math.min(Math.max(e.clientX - g.px, -g.box.left), window.innerWidth - g.box.right);
    const dy = Math.min(Math.max(e.clientY - g.py, -g.box.top), window.innerHeight - g.box.bottom);
    if (Math.abs(dx) + Math.abs(dy) > 3) dragged.current = true;
    place(g.x + dx, g.y + dy);
  };

  const drop = () => {
    drag.current = null;
    dialog.current?.classList.remove("is-dragging");
    input.current?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const h = history.current;
      const step = e.key === "ArrowUp" ? 1 : -1;
      recall.current = Math.max(-1, Math.min(h.length - 1, recall.current + step));
      el.value = recall.current < 0 ? "" : h[recall.current];
    }
  };

  return (
    // A click on the dimmed backdrop lands on the dialog itself and closes it;
    // a click anywhere inside puts the cursor back in the prompt.
    <dialog
      ref={dialog}
      className="term"
      aria-label="Terminal"
      onClick={(e) => {
        // Leave a text selection alone so printed lines can be copied, even
        // when the drag ended out on the backdrop.
        if (window.getSelection()?.isCollapsed === false) return;
        // The end of a drag is not a click on the backdrop.
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        if (e.target === e.currentTarget) dialog.current?.close();
        else if (!(e.target instanceof HTMLButtonElement)) input.current?.focus();
      }}
    >
      <div
        className="term-bar"
        onPointerDown={grab}
        onPointerMove={move}
        onPointerUp={drop}
        onPointerCancel={drop}
      >
        <span>null.rot — /bin/sh</span>
        <button
          type="button"
          className="term-x"
          onClick={() => dialog.current?.close()}
          aria-label="Close terminal"
        >
          ×
        </button>
      </div>
      <div ref={log} className="term-log" aria-live="polite">
        {lines.map((l) => (
          <p key={l.id} className={l.echo ? "term-echo" : undefined}>
            {l.text}
          </p>
        ))}
      </div>
      <label className="term-line">
        <span aria-hidden="true">&gt;</span>
        <span className="sr-only">Command</span>
        <input
          ref={input}
          type="text"
          maxLength={MAX_INPUT}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="send"
          onKeyDown={onKey}
        />
      </label>
    </dialog>
  );
}
