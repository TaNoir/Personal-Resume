"use client";

import { useEffect, useState } from "react";
import { SECRET_IDS } from "@/lib/secrets";

const TOAST_MS = 3000;

/**
 * The site's hidden layer: announces each secret as it is found.
 */
export default function Secrets() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const found = (e: Event) => {
      const { id, count } = (e as CustomEvent<{ id: string; count: number }>).detail ?? {};
      if (!id) return;
      setToast(`secret found ${count}/${SECRET_IDS.length}: ${id}`);
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), TOAST_MS);
    };
    window.addEventListener("rot:secret", found);
    return () => {
      window.removeEventListener("rot:secret", found);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="toast-slot" role="status">
      {toast && (
        <p key={toast} className="toast">
          <span aria-hidden="true">✦</span> {toast}
        </p>
      )}
    </div>
  );
}
