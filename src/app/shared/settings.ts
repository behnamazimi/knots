import { useSyncExternalStore } from "react";
import { platform } from "./platformBridge";
import { createExternalStore, getStorageAdapter } from "./storage";

export type ThemePreference = "system" | "light" | "dark";
export type QualityPreference = "high" | "battery";

const THEME_KEY = "theme";
const QUALITY_KEY = "knots_quality";
const HAS_SEEN_INFO_KEY = "has_seen_info";
const CHECK_UPDATES_STARTUP_KEY = "check_updates_startup";
const LAST_UPDATE_CHECK_KEY = "last_update_check_time";

const settingsStore = createExternalStore({
  storageKeys: [THEME_KEY, QUALITY_KEY, CHECK_UPDATES_STARTUP_KEY],
});

export const subscribeSettings = settingsStore.subscribe;

export function getLastUpdateCheckTime(): number | null {
  try {
    const raw = getStorageAdapter().getItem(LAST_UPDATE_CHECK_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function setLastUpdateCheckTime(time: number) {
  getStorageAdapter().setItem(LAST_UPDATE_CHECK_KEY, String(time));
  settingsStore.notify();
}

export function getCheckUpdatesOnStartup(): boolean {
  try {
    const raw = getStorageAdapter().getItem(CHECK_UPDATES_STARTUP_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

export function setCheckUpdatesOnStartup(enabled: boolean) {
  getStorageAdapter().setItem(CHECK_UPDATES_STARTUP_KEY, String(enabled));
  settingsStore.notify();
}

export function getHasSeenInfo(): boolean {
  try {
    return getStorageAdapter().getItem(HAS_SEEN_INFO_KEY) === "true";
  } catch {
    return true;
  }
}

export function setHasSeenInfo(seen: boolean) {
  getStorageAdapter().setItem(HAS_SEEN_INFO_KEY, String(seen));
  settingsStore.notify();
}

export function getThemePreference(): ThemePreference {
  try {
    const raw = getStorageAdapter().getItem(THEME_KEY);
    if (raw === "light" || raw === "dark") return raw;
    return "system";
  } catch {
    return "system";
  }
}

export function applyTheme(theme: ThemePreference) {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (theme === "system") {
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = prefersDark ? "dark" : "light";
    } else {
      root.dataset.theme = theme;
    }
  }
  getStorageAdapter().setItem(THEME_KEY, theme);
  platform.notifyThemeChanged(theme);
  settingsStore.notify();
}

if (typeof window !== "undefined" && window.matchMedia) {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handleThemeChange = (e: MediaQueryListEvent) => {
    if (getThemePreference() === "system") {
      document.documentElement.dataset.theme = e.matches ? "dark" : "light";
      settingsStore.notify();
    }
  };
  mql.addEventListener?.("change", handleThemeChange);
}

export function getQualityPreference(): QualityPreference {
  try {
    const raw = getStorageAdapter().getItem(QUALITY_KEY);
    return raw === "battery" ? "battery" : "high";
  } catch {
    return "high";
  }
}

export function setQualityPreference(quality: QualityPreference) {
  getStorageAdapter().setItem(QUALITY_KEY, quality);
  settingsStore.notify();
}

export function useSettings() {
  const theme = useSyncExternalStore(
    settingsStore.subscribe,
    getThemePreference,
    (): ThemePreference => "system",
  );

  const quality = useSyncExternalStore(
    settingsStore.subscribe,
    getQualityPreference,
    (): QualityPreference => "high",
  );

  const checkUpdatesOnStartup = useSyncExternalStore(
    settingsStore.subscribe,
    getCheckUpdatesOnStartup,
    () => true,
  );

  return {
    theme,
    quality,
    checkUpdatesOnStartup,
    applyTheme,
    setQualityPreference,
    setCheckUpdatesOnStartup,
  };
}
