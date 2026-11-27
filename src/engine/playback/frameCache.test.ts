import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

interface FakeDB {
  objectStoreNames: { contains: (name: string) => boolean };
  createObjectStore: (name: string) => void;
  transaction: (
    store: string,
    mode: string,
  ) => {
    objectStore: (name: string) => {
      get: (key: string) => {
        onsuccess: (() => void) | null;
        onerror: (() => void) | null;
        result?: unknown;
      };
      put: (
        val: unknown,
        key: string,
      ) => { onsuccess: (() => void) | null; onerror: (() => void) | null };
      delete: (key: string) => { onsuccess: (() => void) | null; onerror: (() => void) | null };
    };
  };
  close: ReturnType<typeof vi.fn>;
  onclose: (() => void) | null;
  onversionchange: (() => void) | null;
}

function installFakeIndexedDB() {
  const store = new Map<string, unknown>();
  const dbs: FakeDB[] = [];

  const open = vi.fn(() => {
    const db: FakeDB = {
      objectStoreNames: { contains: () => true },
      createObjectStore: vi.fn(),
      close: vi.fn(),
      onclose: null,
      onversionchange: null,
      transaction: () => ({
        objectStore: () => ({
          get: (key: string) => {
            const req: {
              onsuccess: (() => void) | null;
              onerror: (() => void) | null;
              result?: unknown;
            } = {
              onsuccess: null,
              onerror: null,
              result: store.get(key),
            };
            queueMicrotask(() => req.onsuccess?.());
            return req;
          },
          put: (val: unknown, key: string) => {
            store.set(key, val);
            const req: { onsuccess: (() => void) | null; onerror: (() => void) | null } = {
              onsuccess: null,
              onerror: null,
            };
            queueMicrotask(() => req.onsuccess?.());
            return req;
          },
          delete: (key: string) => {
            store.delete(key);
            const req: { onsuccess: (() => void) | null; onerror: (() => void) | null } = {
              onsuccess: null,
              onerror: null,
            };
            queueMicrotask(() => req.onsuccess?.());
            return req;
          },
        }),
      }),
    };
    dbs.push(db);

    const openReq: {
      result: FakeDB;
      error: Error | null;
      onupgradeneeded: (() => void) | null;
      onsuccess: (() => void) | null;
      onerror: (() => void) | null;
    } = {
      result: db,
      error: null,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
    };
    queueMicrotask(() => openReq.onsuccess?.());
    return openReq;
  });

  vi.stubGlobal("indexedDB", { open });
  return { open, dbs };
}

describe("frameCache", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("reuses a single IndexedDB connection across reads and writes, and resets on close or versionchange", async () => {
    const { open, dbs } = installFakeIndexedDB();
    const { getCachedBake, setCachedBake } = await import("./frameCache");

    const sample = { frames: new Float32Array([1, 2, 3]), normals: new Float32Array([0, 1, 0]) };
    await setCachedBake("k1", sample);
    const hit = await getCachedBake("k1");
    expect(hit).toEqual(sample);
    expect(open).toHaveBeenCalledTimes(1);

    // Simulate connection close -> next operation should reopen
    dbs[0].onclose?.();
    await getCachedBake("k1");
    expect(open).toHaveBeenCalledTimes(2);

    // Simulate versionchange -> closes db and next operation should reopen
    dbs[1].onversionchange?.();
    expect(dbs[1].close).toHaveBeenCalledTimes(1);
    await getCachedBake("k1");
    expect(open).toHaveBeenCalledTimes(3);
  });

  test("evicts oldest cached bakes beyond MAX_CACHED_BAKES (4)", async () => {
    installFakeIndexedDB();
    const { getCachedBake, setCachedBake } = await import("./frameCache");
    const sample = { frames: new Float32Array([1]), normals: new Float32Array([0, 1, 0]) };

    for (const k of ["k1", "k2", "k3", "k4", "k5"]) {
      await setCachedBake(k, sample);
    }

    expect(await getCachedBake("k1")).toBeNull();
    expect(await getCachedBake("k2")).toEqual(sample);
    expect(await getCachedBake("k5")).toEqual(sample);
  });
});
