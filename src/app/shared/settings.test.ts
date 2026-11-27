import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyTheme,
  getCheckUpdatesOnStartup,
  getHasSeenInfo,
  getQualityPreference,
  getThemePreference,
  setCheckUpdatesOnStartup,
  setHasSeenInfo,
  setQualityPreference,
  subscribeSettings,
} from "./settings";
import {
  createMemoryStorageAdapter,
  resetStorageAdapter,
  setStorageAdapter,
  type StorageAdapter,
} from "./storage";

describe("settings preferences", () => {
  let storage: StorageAdapter;

  beforeEach(() => {
    storage = createMemoryStorageAdapter();
    setStorageAdapter(storage);
  });

  afterEach(() => {
    resetStorageAdapter();
  });

  it("handles hasSeenInfo preference", () => {
    expect(getHasSeenInfo()).toBe(false);
    setHasSeenInfo(true);
    expect(getHasSeenInfo()).toBe(true);
    expect(storage.getItem("has_seen_info")).toBe("true");
  });

  it("handles checkUpdatesOnStartup preference", () => {
    expect(getCheckUpdatesOnStartup()).toBe(true);
    setCheckUpdatesOnStartup(false);
    expect(getCheckUpdatesOnStartup()).toBe(false);
    expect(storage.getItem("check_updates_startup")).toBe("false");
    setCheckUpdatesOnStartup(true);
    expect(getCheckUpdatesOnStartup()).toBe(true);
  });

  it("handles theme and quality preferences", () => {
    expect(getThemePreference()).toBe("system");
    expect(getQualityPreference()).toBe("high");

    setQualityPreference("battery");
    expect(getQualityPreference()).toBe("battery");
  });

  it("notifies settings listeners when applyTheme is called", () => {
    let notifications = 0;
    const unsubscribe = subscribeSettings(() => {
      notifications++;
    });

    applyTheme("dark");
    expect(getThemePreference()).toBe("dark");
    expect(notifications).toBe(1);

    applyTheme("light");
    expect(getThemePreference()).toBe("light");
    expect(notifications).toBe(2);

    unsubscribe();
  });
});
