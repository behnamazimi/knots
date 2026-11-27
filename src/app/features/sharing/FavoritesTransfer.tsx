import { useCallback, useReducer, useRef, useState } from "react";
import { useMountEffect } from "../../shared/hooks";
import { ImportFavoritesModal } from "./ImportFavoritesModal";
import { ScanChoiceSheet } from "./ScanChoiceSheet";
import { ScannerModal } from "./ScannerModal";
import { ShareFavoritesModal } from "./ShareFavoritesModal";
import { parseFavoritesUri, type ParsedFavoritesPayload } from "./qr";
import { isNativeScannerAvailable, readClipboardText, startNativeScanner } from "./scannerBridge";
import sheetStyles from "./SharingSheet.module.css";

export type TransferStep =
  | { kind: "idle" }
  | { kind: "share" }
  | { kind: "choice" }
  | { kind: "paste"; initialValue: string }
  | { kind: "import"; payload: ParsedFavoritesPayload };

export type TransferAction =
  | { type: "openShare" }
  | { type: "openImport" }
  | { type: "openPaste"; initialValue?: string }
  | { type: "openPayload"; payload: ParsedFavoritesPayload }
  | { type: "close" };

export const INITIAL_TRANSFER_STATE: TransferStep = { kind: "idle" };

/** Pure state transitions for the 4-step share/import modal flow. */
export function transferReducer(_state: TransferStep, action: TransferAction): TransferStep {
  switch (action.type) {
    case "openShare":
      return { kind: "share" };
    case "openImport":
      return { kind: "choice" };
    case "openPaste":
      return { kind: "paste", initialValue: action.initialValue ?? "" };
    case "openPayload":
      return { kind: "import", payload: action.payload };
    case "close":
      return INITIAL_TRANSFER_STATE;
  }
}

/** Reads the clipboard and parses any valid Knots favorites URI found. */
export async function readClipboardFavorites(): Promise<{
  text: string;
  payload: ParsedFavoritesPayload;
} | null> {
  const text = await readClipboardText();
  const trimmed = text?.trim();
  if (!trimmed) return null;

  const payload = parseFavoritesUri(trimmed);
  return payload ? { text: trimmed, payload } : null;
}

/** Runs native camera QR scanning, falling back to manual paste or reporting errors via toast. */
export async function executeCameraScan(
  dispatch: (action: TransferAction) => void,
  showToast: (msg: string) => void,
): Promise<void> {
  if (!isNativeScannerAvailable()) {
    dispatch({ type: "openPaste" });
    return;
  }

  try {
    const rawCode = await startNativeScanner();
    const parsed = parseFavoritesUri(rawCode);
    if (parsed) {
      dispatch({ type: "openPayload", payload: parsed });
    } else {
      showToast("Scanned code is not a Knots favorites QR code");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.toLowerCase().includes("cancel")) {
      showToast(msg || "Failed to scan QR code");
    }
  }
}

export interface FavoritesTransferController {
  step: TransferStep;
  toastMessage: string | null;
  openShare: () => void;
  openImport: () => void;
  close: () => void;
  openPaste: (initialValue?: string) => void;
  openPayload: (payload: ParsedFavoritesPayload) => void;
  startCameraScan: () => Promise<void>;
  notifyImported: (count: number) => void;
}

/** Owns the share/import modal state machine, native camera scan flow, and status toast. */
export function useFavoritesTransfer(): FavoritesTransferController {
  const [step, dispatch] = useReducer(transferReducer, INITIAL_TRANSFER_STATE);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMountEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2500);
  }, []);

  const openShare = useCallback(() => dispatch({ type: "openShare" }), []);
  const openImport = useCallback(() => dispatch({ type: "openImport" }), []);
  const close = useCallback(() => dispatch({ type: "close" }), []);
  const openPaste = useCallback(
    (initialValue?: string) => dispatch({ type: "openPaste", initialValue }),
    [],
  );
  const openPayload = useCallback(
    (payload: ParsedFavoritesPayload) => dispatch({ type: "openPayload", payload }),
    [],
  );
  const startCameraScan = useCallback(() => executeCameraScan(dispatch, showToast), [showToast]);
  const notifyImported = useCallback(
    (count: number) => showToast(`Imported ${count} favorites`),
    [showToast],
  );

  return {
    step,
    toastMessage,
    openShare,
    openImport,
    close,
    openPaste,
    openPayload,
    startCameraScan,
    notifyImported,
  };
}

interface FavoritesTransferProps {
  favorites: string[];
  transfer: FavoritesTransferController;
}

/** Renders the active share/import modal step and transient status toast. */
export function FavoritesTransfer({ favorites, transfer }: FavoritesTransferProps) {
  const { step, toastMessage, close, openPaste, openPayload, startCameraScan, notifyImported } =
    transfer;

  return (
    <>
      {step.kind === "share" && <ShareFavoritesModal favorites={favorites} onClose={close} />}

      {step.kind === "choice" && (
        <ScanChoiceSheet
          onClose={close}
          onCameraScan={startCameraScan}
          onManualPaste={openPaste}
          onPayloadFound={openPayload}
        />
      )}

      {step.kind === "paste" && (
        <ScannerModal
          initialValue={step.initialValue}
          onClose={close}
          onCodeScanned={openPayload}
        />
      )}

      {step.kind === "import" && (
        <ImportFavoritesModal payload={step.payload} onClose={close} onSuccess={notifyImported} />
      )}

      {toastMessage && (
        <div className={sheetStyles.toast} role="status">
          {toastMessage}
        </div>
      )}
    </>
  );
}
