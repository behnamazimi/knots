declare global {
  interface KnotsNativeBridge {
    scanQrCode?(): void;
    shareText?(text: string, title?: string): void;
    getClipboardText?(): string | null;
    copyToClipboard?(text: string): void;
    onThemeChanged?(theme: string): void;
    onAppReady?(theme?: string): void;
    getAppVersion?(): string;
    isAppDebug?(): boolean;
  }
  interface Window {
    KnotsNative?: KnotsNativeBridge;
    __onQrScanned?: (text: string) => void;
    __onQrScanCanceled?: () => void;
    __onQrScanError?: (error: string) => void;
  }
}

export interface PlatformAdapter {
  isNativeApp(): boolean;
  isMobileDevice(): boolean;
  getAppVersion(): string | null;
  isAppDebug(): boolean;
  notifyAppReady(theme?: string): void;
  notifyThemeChanged(theme: string): void;
  canScanQrCode(): boolean;
  scanQrCode(): Promise<string>;
  shareText(text: string, title?: string): Promise<boolean>;
  getClipboardText(): Promise<string | null>;
  copyToClipboard(text: string): Promise<boolean>;
}

function getKnotsNative(): KnotsNativeBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return window.KnotsNative;
}

/** Creates the default browser + Android WebView (`window.KnotsNative`) platform adapter. */
export function createDefaultPlatformAdapter(): PlatformAdapter {
  return {
    isNativeApp(): boolean {
      if (typeof window === "undefined" || typeof document === "undefined") return false;
      return (
        document.documentElement?.classList?.contains("is-native-app") ||
        document.body?.classList?.contains("is-native-app") ||
        Boolean(window.matchMedia?.("(display-mode: standalone)").matches) ||
        Boolean(window.navigator?.userAgent?.includes("KnotsApp"))
      );
    },

    isMobileDevice(): boolean {
      if (typeof window === "undefined") return false;
      return Boolean(window.matchMedia?.("(pointer: coarse)").matches);
    },

    getAppVersion(): string | null {
      try {
        const version = getKnotsNative()?.getAppVersion?.();
        return version && version.trim() ? version : null;
      } catch {
        return null;
      }
    },

    isAppDebug(): boolean {
      try {
        return Boolean(getKnotsNative()?.isAppDebug?.());
      } catch {
        return false;
      }
    },

    notifyAppReady(theme?: string): void {
      try {
        getKnotsNative()?.onAppReady?.(theme);
      } catch {
        // Ignore bridge errors when running outside the native shell.
      }
    },

    notifyThemeChanged(theme: string): void {
      try {
        getKnotsNative()?.onThemeChanged?.(theme);
      } catch {
        // Ignore bridge errors when running outside the native shell.
      }
    },

    canScanQrCode(): boolean {
      return typeof getKnotsNative()?.scanQrCode === "function";
    },

    scanQrCode(): Promise<string> {
      return new Promise((resolve, reject) => {
        const native = getKnotsNative();
        if (typeof native?.scanQrCode !== "function") {
          reject(new Error("Native scanner is not available"));
          return;
        }

        const cleanup = () => {
          delete window.__onQrScanned;
          delete window.__onQrScanCanceled;
          delete window.__onQrScanError;
        };

        window.__onQrScanned = (text: string) => {
          cleanup();
          resolve(text);
        };

        window.__onQrScanCanceled = () => {
          cleanup();
          reject(new Error("Scan canceled"));
        };

        window.__onQrScanError = (err: string) => {
          cleanup();
          reject(new Error(err || "Scan failed"));
        };

        try {
          native.scanQrCode();
        } catch (e) {
          cleanup();
          reject(e);
        }
      });
    },

    async shareText(text: string, title?: string): Promise<boolean> {
      const native = getKnotsNative();
      if (typeof native?.shareText === "function") {
        try {
          native.shareText(text, title);
          return true;
        } catch {
          // fallback to navigator.share
        }
      }

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          const isUri = /^https?:\/\/|^knots:\/\//i.test(text);
          await navigator.share(
            isUri
              ? { title, text: `${title ? `${title}: ` : ""}${text}`, url: text }
              : { title, text },
          );
          return true;
        } catch (e: unknown) {
          if (e instanceof Error && e.name === "AbortError") {
            return false;
          }
        }
      }

      return false;
    },

    async getClipboardText(): Promise<string | null> {
      const native = getKnotsNative();
      if (typeof native?.getClipboardText === "function") {
        try {
          const text = native.getClipboardText();
          if (text) return text;
        } catch {
          // fallback to navigator.clipboard
        }
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        try {
          const text = await navigator.clipboard.readText();
          if (text) return text;
        } catch {
          // ignore
        }
      }

      return null;
    },

    async copyToClipboard(text: string): Promise<boolean> {
      const native = getKnotsNative();
      if (typeof native?.copyToClipboard === "function") {
        try {
          native.copyToClipboard(text);
          return true;
        } catch {
          // fallback
        }
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          // ignore
        }
      }

      if (typeof document !== "undefined") {
        try {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
          return true;
        } catch {
          return false;
        }
      }

      return false;
    },
  };
}

/** Creates an isolated in-memory `PlatformAdapter` for unit tests. */
export function createMemoryPlatformAdapter(
  overrides: Partial<PlatformAdapter> = {},
): PlatformAdapter {
  let clipboardText: string | null = null;
  return {
    isNativeApp: () => false,
    isMobileDevice: () => false,
    getAppVersion: () => null,
    isAppDebug: () => false,
    notifyAppReady: () => {},
    notifyThemeChanged: () => {},
    canScanQrCode: () => false,
    scanQrCode: async () => {
      throw new Error("Native scanner is not available");
    },
    shareText: async () => false,
    getClipboardText: async () => clipboardText,
    copyToClipboard: async (text: string) => {
      clipboardText = text;
      return true;
    },
    ...overrides,
  };
}

export let platform: PlatformAdapter = createDefaultPlatformAdapter();

/** Replaces the active `platform` adapter (intended for tests) and returns a restore callback. */
export function setPlatformAdapter(adapter: PlatformAdapter): () => void {
  const prev = platform;
  platform = adapter;
  return () => {
    platform = prev;
  };
}

/** Restores the active `platform` adapter to the default browser/native implementation. */
export function resetPlatformAdapter(): void {
  platform = createDefaultPlatformAdapter();
}
