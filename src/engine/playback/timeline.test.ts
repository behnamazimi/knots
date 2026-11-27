import { afterEach, describe, expect, test, vi } from "vitest";
import type { KnotDef } from "../knots/types";
import { DEFAULT_PHYSICS } from "../sim/rope";
import { Timeline, cacheKey } from "./timeline";

const makeKnot = (overrides: Partial<KnotDef> = {}): KnotDef => ({
  id: "test-knot",
  name: "Test Knot",
  summary: "Test",
  ropes: [
    {
      length: 0.2,
      radius: 0.01,
      start: [
        [0, 0.01, 0],
        [0.2, 0.01, 0],
      ],
    },
  ],
  duration: 0.5,
  steps: [{ t: 0, title: "start" }],
  guides: [
    {
      at: 1,
      grab: 0,
      path: [{ t: 0.5, p: [0.1, 0.05, 0] }],
    },
  ],
  ...overrides,
});

describe("cacheKey", () => {
  test("changes when friction, internalDamping, rope radius, guides, or props change and includes version tag", () => {
    const baseKnot = makeKnot();
    const baseKey = cacheKey(baseKnot, DEFAULT_PHYSICS);

    expect(baseKey).toMatch(/^bake_v\d+_/);

    expect(
      cacheKey(baseKnot, { ...DEFAULT_PHYSICS, friction: DEFAULT_PHYSICS.friction + 0.1 }),
    ).not.toBe(baseKey);
    expect(
      cacheKey(baseKnot, {
        ...DEFAULT_PHYSICS,
        internalDamping: DEFAULT_PHYSICS.internalDamping + 0.1,
      }),
    ).not.toBe(baseKey);
    expect(
      cacheKey(
        makeKnot({
          ropes: [{ ...baseKnot.ropes[0], radius: 0.02 }],
        }),
        DEFAULT_PHYSICS,
      ),
    ).not.toBe(baseKey);
    expect(
      cacheKey(
        makeKnot({
          guides: [{ at: 1, grab: 0, path: [{ t: 0.5, p: [0.1, 0.1, 0] }] }],
        }),
        DEFAULT_PHYSICS,
      ),
    ).not.toBe(baseKey);
    expect(
      cacheKey(
        makeKnot({
          props: [{ kind: "capsule", a: [0, 0, 0], b: [0, 0.1, 0], radius: 0.01 }],
        }),
        DEFAULT_PHYSICS,
      ),
    ).not.toBe(baseKey);
  });
});

describe("Timeline worker error handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("attaches onerror to bake worker, records error, terminates worker, and notifies onError", async () => {
    const instances: {
      onmessage: ((e: MessageEvent) => void) | null;
      onerror: ((e: ErrorEvent) => void) | null;
      postMessage: ReturnType<typeof vi.fn>;
      terminate: ReturnType<typeof vi.fn>;
    }[] = [];

    class FakeWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      postMessage = vi.fn();
      terminate = vi.fn();
      constructor() {
        instances.push(this);
      }
    }

    vi.stubGlobal("Worker", FakeWorker);
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();

    const timeline = new Timeline(makeKnot(), vi.fn(), DEFAULT_PHYSICS, onError);

    // Wait for getCachedBake(key) promise rejection/resolution to start the worker
    await vi.waitFor(() => {
      expect(instances).toHaveLength(1);
    });

    const worker = instances[0];
    expect(worker.onerror).toBeTypeOf("function");

    worker.onerror?.({ message: "worker crashed" } as ErrorEvent);

    expect(timeline.error).toBeInstanceOf(Error);
    expect(timeline.error?.message).toBe("worker crashed");
    expect(onError).toHaveBeenCalledWith(timeline.error);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(consoleErr).toHaveBeenCalled();

    timeline.dispose();
  });
});
