"use client";

import { useEffect, useState } from "react";
import { parseCells, wipeResult } from "@/lib/wall";

/**
 * The owner's controls for the pixel wall: how many pixels are lit, and a
 * button that clears them all. Only rendered once the token has been
 * checked (see WipeGate).
 */
export default function WipeWall({ token, onForget }: { token: string; onForget: () => void }) {
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

  const wipe = async () => {
    if (busy || !window.confirm("Clear every pixel on the wall?")) return;
    setBusy(true);
    const res = await fetch("/api/wall", { method: "DELETE", headers: { "x-wall-token": token } }).catch(() => null);
    const result = wipeResult(res ? res.status : null);
    setMessage(result.text);
    setBusy(false);
    if (result.forget) onForget();
    else void count();
  };

  return (
    <div className="wipe">
      <p className="wipe-status">
        {lit === null ? "Reading the wall…" : `${lit} ${lit === 1 ? "pixel is" : "pixels are"} lit right now.`}
      </p>
      <button type="button" className="btn btn-solid" onClick={wipe} disabled={busy}>
        {busy ? "Clearing…" : "Clear the wall"}
      </button>
      <p className="wipe-message" role="status">
        {message}
      </p>
      <p className="wipe-note">
        This device remembers your token.{" "}
        <button type="button" className="wipe-forget" onClick={onForget}>
          Forget it
        </button>
      </p>
    </div>
  );
}
