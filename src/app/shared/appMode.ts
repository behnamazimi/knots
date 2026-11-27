import { useSyncExternalStore } from "react";
import { platform } from "./platformBridge";

function subscribe(callback: () => void) {
  window.addEventListener("resize", callback);
  let observer: MutationObserver | null = null;
  if (typeof MutationObserver !== "undefined" && document.documentElement) {
    observer = new MutationObserver(callback);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
  return () => {
    window.removeEventListener("resize", callback);
    observer?.disconnect();
  };
}

function getSnapshot(): boolean {
  return platform.isNativeApp();
}

export function useIsNativeApp(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
