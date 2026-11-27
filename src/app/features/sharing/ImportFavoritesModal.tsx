import { AlertTriangle } from "lucide-react";
import { knots } from "../../../engine/knots";
import { mergeFavorites, overwriteFavorites, useFavorites } from "../../shared/favorites";
import { type ParsedFavoritesPayload, validateFavoritesImport } from "./qr";
import { SharingSheet } from "./SharingSheet";
import styles from "./ImportFavoritesModal.module.css";

interface ImportFavoritesModalProps {
  payload: ParsedFavoritesPayload;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

export function ImportFavoritesModal({ payload, onClose, onSuccess }: ImportFavoritesModalProps) {
  const currentFavorites = useFavorites();
  const catalogKnotIds = knots.map((k) => k.id);

  const validation = validateFavoritesImport(payload.knotIds, payload.version, catalogKnotIds);

  const getKnotName = (id: string) => {
    const found = knots.find((k) => k.id === id);
    return found ? found.name : id;
  };

  const handleMerge = () => {
    const result = mergeFavorites(payload.knotIds);
    onSuccess?.(result.totalCount);
    onClose();
  };

  const handleOverwrite = () => {
    const result = overwriteFavorites(payload.knotIds);
    onSuccess?.(result.totalCount);
    onClose();
  };

  const hasExisting = currentFavorites.length > 0;
  const newKnotsCount = payload.knotIds.filter((id) => !currentFavorites.includes(id)).length;

  return (
    <SharingSheet
      title="Import Favorites"
      titleId="import-favorites-title"
      onClose={onClose}
      sheetClassName={styles.sheet}
    >
      <div className={styles.body}>
        {(validation.unknownKnotIds.length > 0 || validation.isNewer) && (
          <div className={styles.warningBanner}>
            <AlertTriangle className={styles.warningIcon} size={20} />
            <p className={styles.warningText}>
              {validation.isNewer && (
                <>
                  Shared from a newer version (v{payload.version}, you have v
                  {validation.receiverVersion}).
                  {validation.unknownKnotIds.length > 0 ? " " : null}
                </>
              )}
              {validation.unknownKnotIds.length > 0 && (
                <>
                  {validation.unknownKnotIds.length}{" "}
                  {validation.unknownKnotIds.length === 1 ? "knot" : "knots"} (
                  {validation.unknownKnotIds.map(getKnotName).join(", ")}){" "}
                  {validation.unknownKnotIds.length === 1 ? "requires" : "require"} updating Knots
                  to view, but will still be saved to your favorites.
                </>
              )}
            </p>
          </div>
        )}

        <div className={styles.knotListContainer}>
          <p className={styles.sectionTitle}>Knots to Import ({payload.knotIds.length})</p>
          <div className={styles.knotChipList}>
            {payload.knotIds.map((id) => {
              const isUnknown = validation.unknownKnotIds.includes(id);
              return (
                <span
                  key={id}
                  className={`${styles.chip} ${isUnknown ? styles.unknown : ""}`}
                  title={isUnknown ? "Requires app update to view" : undefined}
                >
                  {getKnotName(id)}
                  {isUnknown ? " (Update required)" : ""}
                </span>
              );
            })}
          </div>
        </div>

        <div className={styles.actions}>
          {hasExisting ? (
            <>
              <button type="button" className={styles.primaryBtn} onClick={handleMerge}>
                Merge ({newKnotsCount} new, keep {currentFavorites.length} existing)
              </button>
              <button type="button" className={styles.secondaryBtn} onClick={handleOverwrite}>
                Overwrite (Replace all with {payload.knotIds.length} knots)
              </button>
            </>
          ) : (
            <button type="button" className={styles.primaryBtn} onClick={handleMerge}>
              Import All ({payload.knotIds.length} knots)
            </button>
          )}
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </SharingSheet>
  );
}
