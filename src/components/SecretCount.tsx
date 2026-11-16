"use client";

import { SECRET_IDS, useSecrets } from "@/lib/secrets";

/** Footer line: how many secrets this visitor has found, and the way in. */
export default function SecretCount() {
  const found = useSecrets().length;
  const total = SECRET_IDS.length;

  return (
    <p className="secret-count">
      <button
        type="button"
        className="term-open"
        onClick={() => window.dispatchEvent(new CustomEvent("rot:terminal"))}
      >
        &gt;_ terminal
      </button>
      <span>{found === total ? `all ${total} found. good dog.` : `secrets found ${found}/${total}`}</span>
    </p>
  );
}
