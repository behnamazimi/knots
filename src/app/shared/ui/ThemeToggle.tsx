import { Moon, Sun } from "lucide-react";
import { applyTheme, getThemePreference, type ThemePreference, useSettings } from "../settings";
import styles from "./ThemeToggle.module.css";

/** Runs in <head> before first paint so the saved theme shows without a flash. Light is the default if system is light. */
export const THEME_SCRIPT = `try{const t=localStorage.getItem("theme");const d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme:dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}`;

export function toggleTheme(currentTheme: ThemePreference = getThemePreference()) {
  const isDark =
    currentTheme === "dark" ||
    (currentTheme === "system" &&
      typeof document !== "undefined" &&
      document.documentElement.dataset.theme === "dark");
  applyTheme(isDark ? "light" : "dark");
}

/** The sun and moon trade places: one sinks below the horizon while the other rises. Pure CSS off `html[data-theme]`. */
export function ThemeToggle() {
  const { theme } = useSettings();

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => toggleTheme(theme)}
      aria-label="Switch between light and dark theme"
    >
      <Sun className={styles.sun} size={18} aria-hidden />
      <Moon className={styles.moon} size={18} aria-hidden />
    </button>
  );
}
