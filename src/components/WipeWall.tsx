"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { parseCells, wipeResult } from "@/lib/wall";

const TOKEN_KEY = "wall-token";

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
};

const listeners = new Set<() => void>();

const saveToken = (token: string) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
};

/**
 * Clears the pixel wall with the owner's token. The token is asked for once
 * and remembered on this device, so after that it is one press.
 */
export default function WipeWall() {
  // The saved token lives in this browser only; the server render has none.
  const saved = useSyncExternalStore(subscribe, readToken, () => "");
  const [typed, setTyped] = useState("");
  const [lit, setLit] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const count = () =>
    fetch("/api/wall", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { cells?: unknown } | null) => setLit(body ? parseCells(body.cells).split("1").length - 1 : null))
      .catch(() => setLit(null));

  useEffect(() => {
    void count();
  }, []);

  const wipe = async (e: FormEvent) => {
    e.preventDefault();
    const token = saved || typed.trim();
    if (!token || busy) return;
    if (!window.confirm("Clear every pixel on the wall?")) return;
    setBusy(true);
    const res = await fetch("/api/wall", { method: "DELETE", headers: { "x-wall-token": token } }).catch(() => null);
    const result = wipeResult(res ? res.status : null);
    setMessage(result.text);
    if (result.forget) {
      saveToken("");
    } else if (res?.status === 204 && !saved) {
      saveToken(token);
      setTyped("");
    }
    setBusy(false);
    void count();
  };

  return (
    <form className="wipe" onSubmit={wipe}>
      <p className="wipe-status">
        {lit === null ? "Reading the wall…" : `${lit} ${lit === 1 ? "pixel is" : "pixels are"} lit right now.`}
      </p>
      {saved ? (
        <p className="wipe-note">
          Token saved on this device.{" "}
          <button
            type="button"
            className="wipe-forget"
            onClick={() => {
              saveToken("");
              setMessage("Token forgotten on this device.");
            }}
          >
            Forget it
          </button>
        </p>
      ) : (
        <label className="wipe-field">
          <span>Token</span>
          <input
            type="password"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="WALL_ADMIN_TOKEN from Vercel"
          />
        </label>
      )}
      <button type="submit" className="btn btn-solid" disabled={busy || (!saved && !typed.trim())}>
        {busy ? "Clearing…" : "Clear the wall"}
      </button>
      <p className="wipe-message" role="status">
        {message}
      </p>
    </form>
  );
}
