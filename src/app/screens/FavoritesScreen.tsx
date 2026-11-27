import { Download, Heart, Share2 } from "lucide-react";
import { knots } from "../../engine/knots";
import { KnotGrid } from "../features/picker";
import { FavoritesTransfer, useFavoritesTransfer } from "../features/sharing";
import { useFavorites } from "../shared/favorites";
import styles from "./FavoritesScreen.module.css";

interface FavoritesScreenProps {
  onBrowse: () => void;
}

export function FavoritesScreen({ onBrowse }: FavoritesScreenProps) {
  const favorites = useFavorites();
  const favoriteKnots = knots.filter((k) => favorites.includes(k.id));
  const transfer = useFavoritesTransfer();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Favorite Knots</h1>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={transfer.openShare}
            title="Share Favorites"
            aria-label="Share Favorites"
          >
            <Share2 size={20} />
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={transfer.openImport}
            title="Import Favorites"
            aria-label="Import Favorites"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {favoriteKnots.length > 0 ? (
        <KnotGrid knots={favoriteKnots} currentTab="favorites" />
      ) : (
        <div className={styles.empty}>
          <Heart className={styles.emptyIcon} strokeWidth={1.5} />
          <p className={styles.emptyText}>No favorites yet</p>
          <p className={styles.emptySubtext}>
            Tap the heart icon on any knot to save it here for fast access.
          </p>
          <button type="button" className={styles.browseBtn} onClick={onBrowse}>
            Browse Knots
          </button>
        </div>
      )}

      <FavoritesTransfer favorites={favorites} transfer={transfer} />
    </div>
  );
}
