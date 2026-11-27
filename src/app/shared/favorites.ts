import { useSyncExternalStore } from "react";
import { createExternalStore, getStorageAdapter } from "./storage";

const STORAGE_KEY = "knots_favorites";

let cachedRaw: string | null = null;
let cachedFavorites: string[] = [];

const favoritesStore = createExternalStore({
  storageKeys: [STORAGE_KEY],
  onExternalStorageChange: () => {
    cachedRaw = null;
  },
});

function writeFavorites(next: string[]): void {
  try {
    const raw = JSON.stringify(next);
    getStorageAdapter().setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedFavorites = next;
  } catch {
    // quota exceeded or storage disabled
  }
  favoritesStore.notify();
}

export function getFavorites(): string[] {
  try {
    const raw = getStorageAdapter().getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedFavorites = raw ? JSON.parse(raw) : [];
    }
    return cachedFavorites;
  } catch {
    return cachedFavorites;
  }
}

export function isFavorite(id: string): boolean {
  return getFavorites().includes(id);
}

export function setFavorites(next: string[]): void {
  writeFavorites(next);
}

export function mergeFavorites(incoming: string[]): { addedCount: number; totalCount: number } {
  const current = getFavorites();
  const set = new Set(current);
  let added = 0;
  for (const id of incoming) {
    if (!set.has(id)) {
      set.add(id);
      added++;
    }
  }
  const next = Array.from(set);
  setFavorites(next);
  return { addedCount: added, totalCount: next.length };
}

export function overwriteFavorites(incoming: string[]): { totalCount: number } {
  const unique = Array.from(new Set(incoming));
  setFavorites(unique);
  return { totalCount: unique.length };
}

export function toggleFavorite(id: string): boolean {
  const current = getFavorites();
  const next = current.includes(id) ? current.filter((k) => k !== id) : [...current, id];
  writeFavorites(next);
  return next.includes(id);
}

export function useFavorites(): string[] {
  return useSyncExternalStore(favoritesStore.subscribe, getFavorites, () => cachedFavorites);
}
