import { useRef, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { CANONICAL_KNOT_IDS } from "../../../engine/knots/canonical";
import { useMountEffect } from "../../shared/hooks";
import { generateFavoritesUri, renderQrToCanvas } from "./qr";
import { copyTextToClipboard, shareFavoritesLink } from "./scannerBridge";
import { SharingSheet } from "./SharingSheet";
import styles from "./ShareFavoritesModal.module.css";

interface ShareFavoritesModalProps {
  favorites: string[];
  onClose: () => void;
}

export function ShareFavoritesModal({ favorites, onClose }: ShareFavoritesModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const uri = generateFavoritesUri(favorites, undefined, CANONICAL_KNOT_IDS);

  useMountEffect(() => {
    if (canvasRef.current && favorites.length > 0) {
      try {
        renderQrToCanvas(canvasRef.current, uri);
      } catch (err) {
        console.error("Failed to render QR code:", err);
      }
    }
  });

  const handleCopy = async () => {
    try {
      const ok = await copyTextToClipboard(uri);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // ignore copy errors
    }
  };

  const handleShareVia = async () => {
    await shareFavoritesLink(uri, `Favorite Knots (${favorites.length})`);
  };

  return (
    <SharingSheet title="Share Favorites" titleId="share-favorites-title" onClose={onClose}>
      {favorites.length === 0 ? (
        <div className={styles.emptyState}>
          <p>You have not added any favorite knots yet.</p>
        </div>
      ) : (
        <div className={styles.content}>
          <div className={styles.qrContainer}>
            <canvas ref={canvasRef} className={styles.canvas} />
          </div>

          <div className={styles.metaInfo}>
            <p className={styles.countText}>
              {favorites.length} {favorites.length === 1 ? "knot" : "knots"} to share
            </p>
            <p className={styles.hintText}>Show this QR code to scan in person with Knots.</p>
          </div>

          <div className={styles.divider}>
            <span>or share link</span>
          </div>

          <div className={styles.linkSection}>
            <p className={styles.linkSubtext}>Send link via WhatsApp, Messages, or email:</p>
            <div className={styles.linkCopyRow}>
              <div className={styles.linkInputWrap}>
                <input
                  type="text"
                  readOnly
                  className={styles.linkInput}
                  value={uri}
                  aria-label="Favorites Link"
                  title="Swipe or drag to view full link"
                />
              </div>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={handleCopy}
                aria-label="Copy Link"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className={styles.actionButtons}>
            <button type="button" className={styles.shareViaBtn} onClick={handleShareVia}>
              <Share2 size={18} />
              <span>Share via app...</span>
            </button>
            <button type="button" className={styles.doneBtn} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      )}
    </SharingSheet>
  );
}
