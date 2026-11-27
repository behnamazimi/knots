import { platform } from "./platformBridge";

declare const __APP_VERSION__: string | undefined;

export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" && __APP_VERSION__ ? __APP_VERSION__ : "0.1.0";

export function getInstalledVersion(): string {
  const nativeVer = platform.getAppVersion();
  if (nativeVer && nativeVer.trim()) {
    return nativeVer.replace(/^v/, "").trim();
  }
  return APP_VERSION;
}

export function parseSemver(v: string): [number, number, number] {
  const clean = v.replace(/^v/, "").trim();
  const parts = clean.split(".").map((x) => parseInt(x, 10) || 0);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function isNewerVersion(remote: string, current: string = getInstalledVersion()): boolean {
  const [rMaj, rMin, rPatch] = parseSemver(remote);
  const [cMaj, cMin, cPatch] = parseSemver(current);
  if (rMaj !== cMaj) return rMaj > cMaj;
  if (rMin !== cMin) return rMin > cMin;
  return rPatch > cPatch;
}
