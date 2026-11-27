import { useState } from "react";
import { Clipboard } from "lucide-react";
import { useMountEffect } from "../../shared/hooks";
import { parseFavoritesUri, type ParsedFavoritesPayload } from "./qr";
import { readClipboardText } from "./scannerBridge";
import { SharingSheet } from "./SharingSheet";
import styles from "./ScannerModal.module.css";

interface ScannerModalProps {
  initialValue?: string;
  onClose: () => void;
  onCodeScanned: (payload: ParsedFavoritesPayload) => void;
}

export function ScannerModal({ initialValue = "", onClose, onCodeScanned }: ScannerModalProps) {
  const [prevInitialValue, setPrevInitialValue] = useState(initialValue);
  const [inputVal, setInputVal] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  if (initialValue !== prevInitialValue) {
    setPrevInitialValue(initialValue);
    if (initialValue) {
      setInputVal(initialValue);
    }
  }

  useMountEffect(() => {
    if (initialValue) return;
    let cancelled = false;
    readClipboardText().then((clip) => {
      const trimmed = clip?.trim();
      if (!cancelled && trimmed && parseFavoritesUri(trimmed)) {
        setInputVal(trimmed);
      }
    });
    return () => {
      cancelled = true;
    };
  });

  const handlePasteFromClipboard = async () => {
    const text = await readClipboardText();
    if (text) {
      setInputVal(text.trim());
      setError(null);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputVal.trim()) return;

    const parsed = parseFavoritesUri(inputVal.trim());
    if (!parsed) {
      setError("Invalid favorites link. Format should be: knots://fav?v=...&k=...");
      return;
    }

    setError(null);
    onCodeScanned(parsed);
  };

  return (
    <SharingSheet title="Import Favorites" titleId="scanner-modal-title" onClose={onClose}>
      <form className={styles.body} onSubmit={handleSubmit}>
        <p className={styles.description}>
          Paste a shared favorites link or code below to import knots into your favorites.
        </p>

        <div className={styles.inputGroup}>
          <div className={styles.labelRow}>
            <label htmlFor="favorites-link-input" className={styles.label}>
              Favorites Link / Code
            </label>
            <button type="button" className={styles.pasteBtn} onClick={handlePasteFromClipboard}>
              <Clipboard size={14} />
              <span>Paste</span>
            </button>
          </div>
          <input
            id="favorites-link-input"
            type="text"
            className={styles.textInput}
            placeholder="knots://fav?v=0.1.0&k=overhand,bowline"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (error) setError(null);
            }}
            autoFocus
          />
        </div>

        {error && <p className={styles.errorText}>{error}</p>}

        <div className={styles.actions}>
          <button type="submit" className={styles.submitBtn} disabled={!inputVal.trim()}>
            Parse & Import
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </SharingSheet>
  );
}
