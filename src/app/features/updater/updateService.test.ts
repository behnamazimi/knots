import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryPlatformAdapter,
  resetPlatformAdapter,
  setPlatformAdapter,
} from "../../shared/platformBridge";
import {
  checkForUpdate,
  parseNotesToSections,
  triggerUpdate,
  type UpdateInfo,
} from "./updateService";

describe("updateService", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    (globalThis as Record<string, unknown>).window = globalThis;
    delete window.KnotsNative;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetPlatformAdapter();
    vi.restoreAllMocks();
  });

  it("checkForUpdate parses release metadata and selects release apk", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v99.0.0",
        name: "Release v99.0.0",
        body: "Release notes",
        html_url: "https://github.com/behnamazimi/knots/releases/tag/v99.0.0",
        assets: [
          {
            name: "app-debug.apk",
            browser_download_url: "https://example.com/app-debug.apk",
          },
          {
            name: "app-release.apk",
            browser_download_url: "https://example.com/app-release.apk",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const info = await checkForUpdate("0.1.0");
    expect(info).toEqual({
      version: "v99.0.0",
      title: "Release v99.0.0",
      notes: "Release notes",
      sections: [
        {
          title: "Improvements",
          type: "improvements",
          items: ["Release notes"],
        },
      ],
      releaseUrl: "https://github.com/behnamazimi/knots/releases/tag/v99.0.0",
      apkUrl: "https://example.com/app-release.apk",
      isUpdateAvailable: true,
    });
  });

  it("triggerUpdate opens releaseUrl in the system browser", () => {
    const openSpy = vi.fn();
    window.open = openSpy;

    const update: UpdateInfo = {
      version: "v99.0.0",
      title: "Release v99.0.0",
      notes: "",
      releaseUrl: "https://github.com/behnamazimi/knots/releases/tag/v99.0.0",
      apkUrl: "https://example.com/app-release.apk",
      isUpdateAvailable: true,
    };

    triggerUpdate(update);
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      "https://github.com/behnamazimi/knots/releases/tag/v99.0.0",
      "_blank",
      "noopener",
    );
  });

  it("checkForUpdate selects debug apk when PlatformAdapter reports isAppDebug", async () => {
    setPlatformAdapter(createMemoryPlatformAdapter({ isAppDebug: () => true }));
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v99.0.0",
        name: "Release v99.0.0",
        body: "Notes",
        html_url: "https://github.com/behnamazimi/knots/releases/tag/v99.0.0",
        assets: [
          { name: "app-debug.apk", browser_download_url: "https://example.com/app-debug.apk" },
          { name: "app-release.apk", browser_download_url: "https://example.com/app-release.apk" },
        ],
      }),
    }) as unknown as typeof fetch;

    const info = await checkForUpdate("0.1.0");
    expect(info.apkUrl).toBe("https://example.com/app-debug.apk");
  });

  it("parseNotesToSections categorizes markdown headings and bullet items", () => {
    const notes = [
      "- Uncategorized bullet",
      "### New Features",
      "* Direct APK install",
      "### Improvements",
      "- Faster startup",
      "### Bug Fixes",
      "* Fixed crash",
      "## Announcements",
      "- Hello world",
      "### Misc",
      "- Other item",
    ].join("\n");

    expect(parseNotesToSections(notes)).toEqual([
      { type: "improvements", title: "Improvements", items: ["Uncategorized bullet"] },
      { type: "features", title: "New Features", items: ["Direct APK install"] },
      { type: "improvements", title: "Improvements", items: ["Faster startup"] },
      { type: "fixes", title: "Bug Fixes", items: ["Fixed crash"] },
      { type: "announcements", title: "Announcements", items: ["Hello world"] },
      { type: "other", title: "Misc", items: ["Other item"] },
    ]);
  });

  it("checkForUpdate populates sections from release body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v99.0.0",
        name: "Release v99.0.0",
        body: "### New Features\n* Added bowline\n### Bug Fixes\n- Fixed rope",
        html_url: "https://github.com/behnamazimi/knots/releases/tag/v99.0.0",
        assets: [],
      }),
    }) as unknown as typeof fetch;

    const info = await checkForUpdate("0.1.0");
    expect(info.sections).toEqual([
      { type: "features", title: "New Features", items: ["Added bowline"] },
      { type: "fixes", title: "Bug Fixes", items: ["Fixed rope"] },
    ]);
  });
});
