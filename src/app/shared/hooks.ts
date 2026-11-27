import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Runs `effect` once after mount, with its cleanup on unmount. The one sanctioned effect: for
 * starting and stopping things outside React (a WebGL viewer, a worker, a document listener).
 * Remount with a `key` to start over instead of adding dependencies.
 */
// eslint-disable-next-line react-hooks/exhaustive-deps
export const useMountEffect = (effect: () => void | (() => void)) => useEffect(effect, []);

const backHandlers: Array<() => void> = [];

/** Dismisses the topmost mounted overlay (sheet/modal), returning true if one was open. */
export function dismissTopOverlay(): boolean {
  const top = backHandlers[backHandlers.length - 1];
  if (!top) return false;
  top();
  return true;
}

/** Calls `onClose` when Escape or Android hardware Back is pressed, keeping listeners mounted once. */
export function useEscapeKey(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  // oxlint-disable-next-line react/refs
  onCloseRef.current = onClose;
  useMountEffect(() => {
    const close = () => onCloseRef.current();
    backHandlers.push(close);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      const idx = backHandlers.lastIndexOf(close);
      if (idx !== -1) backHandlers.splice(idx, 1);
      window.removeEventListener("keydown", handleKey);
    };
  });
}

const noop = () => () => {};
/** False while prerendering and hydrating, true after; for parts that only exist in the browser. */
export const useIsClient = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
