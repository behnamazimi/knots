import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDefaultPlatformAdapter,
  createMemoryPlatformAdapter,
  platform,
  resetPlatformAdapter,
  setPlatformAdapter,
} from "./platformBridge";

describe("platformBridge", () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).window = globalThis;
    delete window.KnotsNative;
    delete window.__onQrScanned;
    delete window.__onQrScanCanceled;
    delete window.__onQrScanError;
    resetPlatformAdapter();
  });

  afterEach(() => {
    resetPlatformAdapter();
    vi.restoreAllMocks();
  });

  describe("createDefaultPlatformAdapter", () => {
    it("reads version, debug flag, and notifies native lifecycle hooks", () => {
      const onAppReady = vi.fn();
      const onThemeChanged = vi.fn();
      window.KnotsNative = {
        getAppVersion: () => "v1.4.2",
        isAppDebug: () => true,
        onAppReady,
        onThemeChanged,
      };

      const adapter = createDefaultPlatformAdapter();
      expect(adapter.getAppVersion()).toBe("v1.4.2");
      expect(adapter.isAppDebug()).toBe(true);

      adapter.notifyAppReady("dark");
      expect(onAppReady).toHaveBeenCalledWith("dark");

      adapter.notifyThemeChanged("light");
      expect(onThemeChanged).toHaveBeenCalledWith("light");
    });

    it("returns safe defaults when KnotsNative is absent", () => {
      const adapter = createDefaultPlatformAdapter();
      expect(adapter.getAppVersion()).toBeNull();
      expect(adapter.isAppDebug()).toBe(false);
      expect(adapter.canScanQrCode()).toBe(false);
      expect(() => adapter.notifyAppReady("system")).not.toThrow();
      expect(() => adapter.notifyThemeChanged("dark")).not.toThrow();
    });

    it("handles native QR scanning callbacks and cleans up globals", async () => {
      const scanQrCode = vi.fn(() => {
        setTimeout(() => window.__onQrScanned?.("knots://fav?v=0.1.0&k=bowline"), 0);
      });
      window.KnotsNative = { scanQrCode };

      const adapter = createDefaultPlatformAdapter();
      expect(adapter.canScanQrCode()).toBe(true);
      await expect(adapter.scanQrCode()).resolves.toBe("knots://fav?v=0.1.0&k=bowline");
      expect(window.__onQrScanned).toBeUndefined();
      expect(window.__onQrScanCanceled).toBeUndefined();
      expect(window.__onQrScanError).toBeUndefined();
    });

    it("rejects and cleans up globals when QR scan errors or is canceled", async () => {
      window.KnotsNative = {
        scanQrCode: () => {
          setTimeout(() => window.__onQrScanError?.("Camera denied"), 0);
        },
      };

      const adapter = createDefaultPlatformAdapter();
      await expect(adapter.scanQrCode()).rejects.toThrow("Camera denied");
      expect(window.__onQrScanError).toBeUndefined();
    });
  });

  describe("setPlatformAdapter & createMemoryPlatformAdapter", () => {
    it("swaps the active platform adapter and restores it", async () => {
      const memory = createMemoryPlatformAdapter({
        isNativeApp: () => true,
        isMobileDevice: () => true,
        getAppVersion: () => "2.0.0",
        isAppDebug: () => true,
        canScanQrCode: () => true,
        scanQrCode: async () => "knots://fav?v=2.0.0&k=clove-hitch",
      });

      const restore = setPlatformAdapter(memory);
      expect(platform.isNativeApp()).toBe(true);
      expect(platform.isMobileDevice()).toBe(true);
      expect(platform.getAppVersion()).toBe("2.0.0");
      expect(platform.isAppDebug()).toBe(true);
      await expect(platform.scanQrCode()).resolves.toBe("knots://fav?v=2.0.0&k=clove-hitch");

      await expect(platform.copyToClipboard("hello")).resolves.toBe(true);
      await expect(platform.getClipboardText()).resolves.toBe("hello");

      restore();
      expect(platform.getAppVersion()).toBeNull();
      expect(platform.isAppDebug()).toBe(false);
    });
  });
});
