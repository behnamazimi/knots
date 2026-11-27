export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const browserStorageAdapter: StorageAdapter = {
  getItem: (key) => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // quota exceeded or storage disabled
    }
  },
  removeItem: (key) => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

let activeAdapter: StorageAdapter = browserStorageAdapter;

export function getStorageAdapter(): StorageAdapter {
  return activeAdapter;
}

export function setStorageAdapter(adapter: StorageAdapter): void {
  activeAdapter = adapter;
}

export function resetStorageAdapter(): void {
  activeAdapter = browserStorageAdapter;
}

export function createMemoryStorageAdapter(initial?: Record<string, string>): StorageAdapter {
  const map = new Map<string, string>(initial ? Object.entries(initial) : undefined);
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

export interface ExternalStoreOptions {
  /** Keys that trigger a refresh when modified in another tab via `storage` events. */
  storageKeys?: readonly string[];
  /** Optional hook run before notifying listeners on an external `storage` event. */
  onExternalStorageChange?: () => void;
}

export interface ExternalStore {
  subscribe: (listener: () => void) => () => void;
  notify: () => void;
}

/** Shared subscription + cross-tab `storage` event plumbing for `useSyncExternalStore` stores. */
export function createExternalStore(options: ExternalStoreOptions = {}): ExternalStore {
  const listeners = new Set<() => void>();
  const keySet = options.storageKeys ? new Set(options.storageKeys) : null;

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    let onStorage: ((e: StorageEvent) => void) | null = null;
    if (keySet && typeof window !== "undefined" && typeof window.addEventListener === "function") {
      onStorage = (e: StorageEvent) => {
        if (e.key === null || keySet.has(e.key)) {
          options.onExternalStorageChange?.();
          listener();
        }
      };
      window.addEventListener("storage", onStorage);
    }
    return () => {
      listeners.delete(listener);
      if (
        onStorage &&
        typeof window !== "undefined" &&
        typeof window.removeEventListener === "function"
      ) {
        window.removeEventListener("storage", onStorage);
      }
    };
  }

  return { subscribe, notify };
}
