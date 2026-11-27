import { parseMarkdownReleaseSections } from "../../shared/changelog";
import { platform } from "../../shared/platformBridge";
import { GITHUB_API_LATEST_RELEASE_URL, RELEASES_URL } from "../../shared/site";
import { APP_VERSION, isNewerVersion } from "../../shared/version";

export interface UpdateSection {
  type: "features" | "improvements" | "fixes" | "announcements" | "other";
  title: string;
  items: string[];
}

export interface UpdateInfo {
  version: string;
  title: string;
  notes: string;
  sections?: UpdateSection[];
  releaseUrl: string;
  apkUrl: string | null;
  isUpdateAvailable: boolean;
}

export function parseNotesToSections(notes: string): UpdateSection[] {
  return parseMarkdownReleaseSections(notes);
}

export async function checkForUpdate(currentVersion: string = APP_VERSION): Promise<UpdateInfo> {
  const res = await fetch(GITHUB_API_LATEST_RELEASE_URL, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) {
    if (res.status === 404) {
      return {
        version: currentVersion,
        title: "Current Version",
        notes: "No newer releases found on GitHub.",
        sections: [],
        releaseUrl: RELEASES_URL,
        apkUrl: null,
        isUpdateAvailable: false,
      };
    }
    throw new Error(`GitHub check failed (${res.status})`);
  }
  const data = await res.json();
  const remoteTag = (data.tag_name || "").trim();
  const isDebug = platform.isAppDebug();
  const targetName = isDebug ? "app-debug.apk" : "app-release.apk";
  const assets: Array<{ name: string; browser_download_url: string }> = data.assets || [];
  const apkAsset =
    assets.find((a) => a.name === targetName) || assets.find((a) => a.name.endsWith(".apk"));
  const notes = data.body || "";

  return {
    version: remoteTag,
    title: data.name || remoteTag,
    notes,
    sections: parseNotesToSections(notes),
    releaseUrl: data.html_url || `${RELEASES_URL}/latest`,
    apkUrl: apkAsset?.browser_download_url ?? null,
    isUpdateAvailable: remoteTag ? isNewerVersion(remoteTag, currentVersion) : false,
  };
}

export function triggerUpdate(update: UpdateInfo): void {
  if (typeof window !== "undefined") {
    window.open(update.releaseUrl, "_blank", "noopener");
  }
}
