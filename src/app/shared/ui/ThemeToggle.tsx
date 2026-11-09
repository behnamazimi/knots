import { Moon, Sun } from "lucide-react";
import styles from "./ThemeToggle.module.css";

/** Runs in <head> before first paint so the saved theme shows without a flash. Light is the default. */
export const THEME_SCRIPT = `try{document.documentElement.dataset.theme=localStorage.getItem("theme")==="dark"?"dark":"light"}catch(e){}`;

function toggle() {
  const root = document.documentElement;
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {
    // private mode: the choice just lasts for this page
  }
}

/** The sun and moon trade places: one sinks below the horizon while the other rises. Pure CSS off `html[data-theme]`. */
export function ThemeToggle() {
  return (
    <button type="button" className={styles.toggle} onClick={toggle} aria-label="Switch theme">
      <Sun className={styles.sun} size={18} aria-hidden />
      <Moon className={styles.moon} size={18} aria-hidden />
    </button>
  );
}
