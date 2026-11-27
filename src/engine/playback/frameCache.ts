const DB_NAME = "knots-bake-cache";
const STORE_NAME = "bakes";
const DB_VERSION = 1;
const MAX_CACHED_BAKES = 4;
const LRU_KEY = "__lru_keys__";

export interface CachedBake {
  frames: Float32Array;
  normals: Float32Array;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      dbPromise = null;
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const reset = () => {
        dbPromise = null;
      };
      db.onclose = reset;
      db.onversionchange = () => {
        db.close();
        reset();
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

/** Retrieves cached frames & normals for a knot bake, or null if not cached or unavailable. */
export async function getCachedBake(key: string): Promise<CachedBake | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as CachedBake) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Stores fully baked frames & normals for a knot in IndexedDB, keeping at most MAX_CACHED_BAKES entries. */
export async function setCachedBake(key: string, data: CachedBake): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const lruReq = store.get(LRU_KEY);
      lruReq.onsuccess = () => {
        const prev = Array.isArray(lruReq.result) ? (lruReq.result as string[]) : [];
        const next = [...prev.filter((k) => k !== key), key];
        while (next.length > MAX_CACHED_BAKES) {
          const oldest = next.shift();
          if (oldest && typeof store.delete === "function") store.delete(oldest);
        }
        store.put(next, LRU_KEY);
        const putReq = store.put(data, key);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      lruReq.onerror = () => {
        const putReq = store.put(data, key);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
    });
  } catch {
    // Non-fatal if storage quota is exceeded or storage is disabled
  }
}
