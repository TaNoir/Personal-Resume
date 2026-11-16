import { useSyncExternalStore } from "react";

/** Every secret on the site, in the order the spec lists them. */
export const SECRET_IDS = ["terminal", "bark", "sudo", "konami", "bite", "console"] as const;
export type SecretId = (typeof SECRET_IDS)[number];

const KEY = "secrets";
const EMPTY: SecretId[] = [];
const isId = (v: unknown): v is SecretId => (SECRET_IDS as readonly unknown[]).includes(v);

/** Reads the stored list, dropping anything that isn't a known secret. */
export function parseSecrets(raw: string | null): SecretId[] {
  if (!raw) return [];
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return [...new Set(list.filter(isId))];
  } catch {
    return [];
  }
}

/** The list with `id` added, or the same list if it was already there. */
export function addSecret(list: SecretId[], id: SecretId): SecretId[] {
  return list.includes(id) ? list : [...list, id];
}

// The parsed list is cached so React gets the same array until it changes.
let cache: SecretId[] | null = null;

export function foundSecrets(): SecretId[] {
  if (cache) return cache;
  try {
    cache = parseSecrets(localStorage.getItem(KEY));
  } catch {
    cache = [];
  }
  return cache;
}

/**
 * Marks a secret as found. Returns true only the first time. If the browser
 * blocks storage it still counts for this visit.
 */
export function findSecret(id: SecretId): boolean {
  const list = foundSecrets();
  const next = addSecret(list, id);
  if (next === list) return false;
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new CustomEvent("rot:secret", { detail: { id, count: next.length } }));
  return true;
}

const subscribe = (changed: () => void) => {
  // Another tab finding a secret arrives as a storage event.
  const fromStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    changed();
  };
  window.addEventListener("rot:secret", changed);
  window.addEventListener("storage", fromStorage);
  return () => {
    window.removeEventListener("rot:secret", changed);
    window.removeEventListener("storage", fromStorage);
  };
};

/** The secrets this visitor has found; empty on the server. */
export function useSecrets(): SecretId[] {
  return useSyncExternalStore(subscribe, foundSecrets, () => EMPTY);
}
