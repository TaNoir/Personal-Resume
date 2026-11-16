"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { findSecret, useSecrets } from "@/lib/secrets";
import { MAX_INPUT, run, type Effect } from "@/lib/terminal";
import { setTheme } from "@/lib/theme";

const MAX_LINES = 200;

type Line = { id: number; text: string; echo?: boolean };

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

const send = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));

/**
 * A small fake shell. Opens with the backtick key or the footer button.
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

  const print = (texts: string[], echo = false) => {
    if (!texts.length) return;
    setLines((old) =>
      [...old, ...texts.map((text) => ({ id: nextId.current++, text, echo }))].slice(-MAX_LINES),
    );
  };

  const open = () => {
    const d = dialog.current;
    if (!d || d.open) return;
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
        if (e.target === e.currentTarget) dialog.current?.close();
        else if (!(e.target instanceof HTMLButtonElement)) input.current?.focus();
      }}
    >
      <div className="term-bar">
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
