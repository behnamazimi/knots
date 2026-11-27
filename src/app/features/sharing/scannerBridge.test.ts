import { beforeEach, describe, expect, it, vi } from "vitest";
import { isNativeScannerAvailable, shareFavoritesLink, startNativeScanner } from "./scannerBridge";

describe("scannerBridge", () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).window = globalThis;
    delete (window as unknown as { KnotsNative?: unknown }).KnotsNative;
    delete (window as unknown as { __onQrScanned?: unknown }).__onQrScanned;
    delete (window as unknown as { __onQrScanCanceled?: unknown }).__onQrScanCanceled;
    delete (window as unknown as { __onQrScanError?: unknown }).__onQrScanError;
  });

  it("detects when native scanner is available or unavailable", () => {
    expect(isNativeScannerAvailable()).toBe(false);

    (window as unknown as { KnotsNative: { scanQrCode: () => void } }).KnotsNative = {
      scanQrCode: vi.fn(),
    };
    expect(isNativeScannerAvailable()).toBe(true);
  });

  it("resolves when native scanner returns scanned string", async () => {
    const scanQrCodeMock = vi.fn().mockImplementation(() => {
      setTimeout(() => {
        window.__onQrScanned?.("knots://fav?v=0.1.0&k=bowline");
      }, 5);
    });

    (window as unknown as { KnotsNative: { scanQrCode: () => void } }).KnotsNative = {
      scanQrCode: scanQrCodeMock,
    };

    const promise = startNativeScanner();
    expect(scanQrCodeMock).toHaveBeenCalled();
    const result = await promise;
    expect(result).toBe("knots://fav?v=0.1.0&k=bowline");
    expect(window.__onQrScanned).toBeUndefined();
  });

  it("rejects when native scanner is canceled", async () => {
    const scanQrCodeMock = vi.fn().mockImplementation(() => {
      setTimeout(() => {
        window.__onQrScanCanceled?.();
      }, 5);
    });

    (window as unknown as { KnotsNative: { scanQrCode: () => void } }).KnotsNative = {
      scanQrCode: scanQrCodeMock,
    };

    await expect(startNativeScanner()).rejects.toThrow("Scan canceled");
  });

  it("shares via native bridge when available", async () => {
    const shareTextMock = vi.fn();
    (
      window as unknown as { KnotsNative: { shareText: (text: string, title?: string) => void } }
    ).KnotsNative = {
      shareText: shareTextMock,
    };

    const shared = await shareFavoritesLink("knots://fav?v=0.1.0", "My Knots");
    expect(shared).toBe(true);
    expect(shareTextMock).toHaveBeenCalledWith("knots://fav?v=0.1.0", "My Knots");
  });

  it("reads and writes clipboard via native bridge when available", async () => {
    const getClipboardTextMock = vi.fn().mockReturnValue("knots://fav?v=0.1.0&b=abc");
    const copyToClipboardMock = vi.fn();
    (
      window as unknown as {
        KnotsNative: { getClipboardText: () => string; copyToClipboard: (t: string) => void };
      }
    ).KnotsNative = {
      getClipboardText: getClipboardTextMock,
      copyToClipboard: copyToClipboardMock,
    };

    const { readClipboardText, copyTextToClipboard } = await import("./scannerBridge");
    const clip = await readClipboardText();
    expect(clip).toBe("knots://fav?v=0.1.0&b=abc");
    expect(getClipboardTextMock).toHaveBeenCalled();

    const copied = await copyTextToClipboard("knots://fav?test");
    expect(copied).toBe(true);
    expect(copyToClipboardMock).toHaveBeenCalledWith("knots://fav?test");
  });
});
