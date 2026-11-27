import { useState } from "react";
import { Camera, Clipboard } from "lucide-react";
import { useMountEffect } from "../../shared/hooks";
import { parseFavoritesUri, type ParsedFavoritesPayload } from "./qr";
import { readClipboardText } from "./scannerBridge";
import { SharingSheet } from "./SharingSheet";
import styles from "./ScanChoiceSheet.module.css";

interface ScanChoiceSheetProps {
  onClose: () => void;
  onCameraScan: () => void;
  onManualPaste: (prefilledText?: string) => void;
  onPayloadFound: (payload: ParsedFavoritesPayload) => void;
}

export function ScanChoiceSheet({
  onClose,
  onCameraScan,
  onManualPaste,
  onPayloadFound,
}: ScanChoiceSheetProps) {
  const [clipboardPayload, setClipboardPayload] = useState<{
    text: string;
    payload: ParsedFavoritesPayload;
  } | null>(null);

  useMountEffect(() => {
    let active = true;
    // Check clipboard for prefill
    readClipboardText().then((text) => {
      if (active && text && text.trim()) {
        const parsed = parseFavoritesUri(text.trim());
        if (parsed) {
          setClipboardPayload({ text: text.trim(), payload: parsed });
        }
      }
    });
    return () => {
      active = false;
    };
  });

  return (
    <SharingSheet title="Import Favorites" titleId="scan-choice-title" onClose={onClose}>
      {clipboardPayload && (
        <div className={styles.clipboardBanner}>
          <div className={styles.clipboardText}>
            <p className={styles.clipboardTitle}>Link found in clipboard</p>
            <p className={styles.clipboardSub}>
              {clipboardPayload.payload.knotIds.length} knots to import
            </p>
          </div>
          <button
            type="button"
            className={styles.clipboardBtn}
            onClick={() => {
              onClose();
              onPayloadFound(clipboardPayload.payload);
            }}
          >
            Import Now
          </button>
        </div>
      )}

      <div className={styles.optionsList}>
        <button
          type="button"
          className={styles.optionBtn}
          onClick={() => {
            onClose();
            onCameraScan();
          }}
        >
          <div className={styles.optionIconWrap}>
            <Camera size={22} />
          </div>
          <div className={styles.optionText}>
            <p className={styles.optionTitle}>Scan QR with Camera</p>
            <p className={styles.optionSub}>Scan another device's screen or paper</p>
          </div>
        </button>

        <button
          type="button"
          className={styles.optionBtn}
          onClick={() => {
            onClose();
            onManualPaste(clipboardPayload?.text);
          }}
        >
          <div className={styles.optionIconWrap}>
            <Clipboard size={22} />
          </div>
          <div className={styles.optionText}>
            <p className={styles.optionTitle}>Paste Link or Code</p>
            <p className={styles.optionSub}>Enter or paste a knots://fav link</p>
          </div>
        </button>
      </div>
    </SharingSheet>
  );
}
