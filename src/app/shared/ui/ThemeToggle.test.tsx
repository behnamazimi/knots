import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getThemePreference, subscribeSettings } from "../settings";
import { createMemoryStorageAdapter, resetStorageAdapter, setStorageAdapter } from "../storage";
import { ThemeToggle, toggleTheme } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    setStorageAdapter(createMemoryStorageAdapter());
  });

  afterEach(() => {
    resetStorageAdapter();
  });

  it("renders toggle button subscribed to settings", () => {
    const html = renderToStaticMarkup(<ThemeToggle />);
    expect(html).toContain('aria-label="Switch between light and dark theme"');
  });

  it("updates settings store and notifies useSettings listeners when toggled", () => {
    const observedThemes: string[] = [];
    const unsubscribe = subscribeSettings(() => {
      observedThemes.push(getThemePreference());
    });

    toggleTheme("light");
    expect(getThemePreference()).toBe("dark");

    toggleTheme();
    expect(getThemePreference()).toBe("light");

    expect(observedThemes).toEqual(["dark", "light"]);
    unsubscribe();
  });
});
