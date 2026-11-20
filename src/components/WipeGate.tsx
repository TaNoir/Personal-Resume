"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import WipeWall from "@/components/WipeWall";
import { tokenFromHash } from "@/lib/wall";

const TOKEN_KEY = "wall-token";

const stored = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
};

const store = (token: string) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

/**
 * /wipe is a plain 404 for everyone. On the owner's devices it turns into
 * the wall controls: open /wipe#<token> once, the token is checked with the
 * server and remembered, and after that /wipe opens the controls directly.
 */
export default function WipeGate({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [token, setToken] = useState("");

  useEffect(() => {
    if (path !== "/wipe") return;
    let gone = false;
    const check = () => {
      const fromHash = tokenFromHash(window.location.hash);
      // Take the token out of the address bar and history either way.
      if (window.location.hash) history.replaceState(null, "", window.location.pathname);
      const candidate = fromHash || stored();
      if (!candidate) return;
      void fetch("/api/owner", { method: "POST", headers: { "x-wall-token": candidate } })
        .then((res) => {
          if (gone) return;
          if (res.status === 204) {
            store(candidate);
            setToken(candidate);
          } else if (res.status === 401 && !fromHash) {
            store("");
          }
        })
        .catch(() => {});
    };
    check();
    // Pasting /wipe#token into a tab that is already on /wipe only changes
    // the hash, which doesn't reload the page.
    window.addEventListener("hashchange", check);
    return () => {
      gone = true;
      window.removeEventListener("hashchange", check);
    };
  }, [path]);

  if (!token) return <>{children}</>;

  return (
    <div className="page lost">
      <p className="lost-code" aria-hidden="true">
        wall
      </p>
      <h1>Wall controls</h1>
      <p className="lost-copy">Only you see this. Everyone else gets the 404.</p>
      <WipeWall
        token={token}
        onForget={() => {
          store("");
          setToken("");
        }}
      />
      <Link className="link" href="/">
        Back to the homepage
      </Link>
    </div>
  );
}
