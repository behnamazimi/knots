import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "../../shared/hooks";
import styles from "./SharingSheet.module.css";

interface SharingSheetProps {
  title: string;
  titleId: string;
  onClose: () => void;
  sheetClassName?: string;
  children: ReactNode;
}

/** Shared bottom-sheet / centered dialog shell for favorites sharing modals. */
export function SharingSheet({
  title,
  titleId,
  onClose,
  sheetClassName,
  children,
}: SharingSheetProps) {
  useEscapeKey(onClose);

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={sheetClassName ? `${styles.sheet} ${sheetClassName}` : styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
