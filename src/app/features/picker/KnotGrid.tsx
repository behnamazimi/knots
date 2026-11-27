import { Heart } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { isLatestKnot } from "../../../engine/knots";
import type { KnotDef } from "../../../engine/knots/types";
import { useIsNativeApp } from "../../shared/appMode";
import { toggleFavorite, useFavorites } from "../../shared/favorites";
import { JOBS, KNOT_INFO } from "../../shared/knotInfo";
import { knotImagePath, knotPath } from "../../shared/site";
import { PlayIcon } from "../../shared/ui/icons";
import styles from "./grid.module.css";

const seconds = (s: number) => `${Math.round(s * 10) / 10} s`;

/** Every knot as a card, with a row of jobs to narrow them. Filtered-out cards are hidden, not removed. */
export function KnotGrid({
  knots,
  searchQuery = "",
  showFavoritesToggle,
  showFilters = true,
  currentTab,
  onBeforeNavigate,
}: {
  knots: KnotDef[];
  searchQuery?: string;
  showFavoritesToggle?: boolean;
  showFilters?: boolean;
  currentTab?: string;
  onBeforeNavigate?: () => void;
}) {
  const isNativeApp = useIsNativeApp();
  const showFavs = showFavoritesToggle ?? isNativeApp;
  const [job, setJob] = useState<string>("all");
  const favorites = useFavorites();

  const query = searchQuery.trim().toLowerCase();

  return (
    <>
      {showFilters && (
        <div className={styles.filters} role="group" aria-label="Filter by job">
          {JOBS.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={job === id} onClick={() => setJob(id)}>
              {label}
            </button>
          ))}
        </div>
      )}
      <div className={styles.grid}>
        {knots.map((k) => {
          const info = KNOT_INFO[k.id];
          const matchesJob = job === "all" || info.job === job;
          const matchesSearch =
            !query ||
            k.name.toLowerCase().includes(query) ||
            info.line.toLowerCase().includes(query) ||
            k.summary.toLowerCase().includes(query);
          const isHidden = !matchesJob || !matchesSearch;
          const isFav = favorites.includes(k.id);

          return (
            <Link
              key={k.id}
              to={knotPath(k.id)}
              state={{ fromTab: currentTab }}
              onPointerDown={() => {
                import("../../routes/knot").catch(() => {});
              }}
              onClick={() => onBeforeNavigate?.()}
              className={styles.card}
              hidden={isHidden}
              id={`knot-card-${k.id}`}
            >
              <div className={styles.img}>
                <img
                  src={knotImagePath(k.id)}
                  alt={`${k.name}, finished`}
                  width={1200}
                  height={630}
                  loading="lazy"
                  decoding="async"
                />
                {isNativeApp && isLatestKnot(k.id) && (
                  <span className={styles.newBadge}>
                    <span className={styles.newBadgeStar}>✦</span>
                    New
                  </span>
                )}
                <span className={styles.badge}>
                  <PlayIcon />
                  {seconds(k.duration)}
                </span>
                {showFavs && (
                  <button
                    type="button"
                    className={`${styles.favBtn} ${isFav ? styles.favBtnActive : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(k.id);
                    }}
                    aria-label={
                      isFav ? `Remove ${k.name} from favorites` : `Add ${k.name} to favorites`
                    }
                  >
                    <Heart size={16} fill={isFav ? "currentColor" : "none"} />
                  </button>
                )}
              </div>
              <div className={styles.body}>
                <h3>{k.name}</h3>
                <p>{info.line}</p>
                <span className={styles.meta}>
                  {k.steps.length} steps{k.ropes.length > 1 ? ` · ${k.ropes.length} ropes` : ""}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
