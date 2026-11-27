import { afterEach, describe, expect, test } from "vitest";
import {
  createMemoryPlatformAdapter,
  resetPlatformAdapter,
  setPlatformAdapter,
} from "./platformBridge";
import { APP_VERSION, getInstalledVersion, isNewerVersion, parseSemver } from "./version";

describe("version parsing and comparison", () => {
  afterEach(() => {
    resetPlatformAdapter();
  });

  test("parseSemver extracts major, minor, patch", () => {
    expect(parseSemver("v1.2.3")).toEqual([1, 2, 3]);
    expect(parseSemver("0.1.0")).toEqual([0, 1, 0]);
    expect(parseSemver("2.0")).toEqual([2, 0, 0]);
  });

  test("isNewerVersion correctly compares versions", () => {
    expect(isNewerVersion("v0.2.0", "v0.1.0")).toBe(true);
    expect(isNewerVersion("v1.0.0", "v0.9.9")).toBe(true);
    expect(isNewerVersion("v0.1.1", "v0.1.0")).toBe(true);
    expect(isNewerVersion("v0.1.0", "v0.1.0")).toBe(false);
    expect(isNewerVersion("v0.0.9", "v0.1.0")).toBe(false);
  });

  test("getInstalledVersion reads from PlatformAdapter and falls back to APP_VERSION", () => {
    setPlatformAdapter(createMemoryPlatformAdapter({ getAppVersion: () => "v1.5.0" }));
    expect(getInstalledVersion()).toBe("1.5.0");

    setPlatformAdapter(createMemoryPlatformAdapter({ getAppVersion: () => null }));
    expect(getInstalledVersion()).toBe(APP_VERSION);
  });
});
