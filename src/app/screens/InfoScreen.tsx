import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import type { KnotDef } from "../../engine/knots/types";
import { Player } from "../../engine/playback/player";
import { physicsFromParams } from "../features/tuner";
import { knotPath } from "../shared/site";
import { KnotStage } from "./KnotStage";
import styles from "./InfoScreen.module.css";

interface InfoScreenProps {
  firstKnot: KnotDef;
  player: Player;
  onBack?: () => void;
  onBrowseKnots?: () => void;
}

export function InfoScreen({ firstKnot, player, onBack, onBrowseKnots }: InfoScreenProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {onBack && (
          <button
            type="button"
            className={styles.backBtn}
            onClick={onBack}
            aria-label="Back to Settings"
          >
            <ArrowLeft size={18} />
            <span>Settings</span>
          </button>
        )}
        <h1 className={styles.title}>Overview</h1>
      </div>

      <section className={styles.hero} aria-label="A knot being tied">
        <div className={styles.text}>
          <h2 className={styles.headline}>
            Knots, tied slowly enough to follow.
            <span className={styles.subheadline}>
              Watch each knot tie itself on a simulated rope. Turn it, pause it, drag through the
              steps.
            </span>
          </h2>
          <p className={styles.honest}>
            Not a video. Invisible hands pull a few points of the rope and physics does the rest.
            Drag to look around.
          </p>
          <Link className={styles.go} to={knotPath(firstKnot.id)}>
            How to tie the {firstKnot.name.toLowerCase()} <span aria-hidden="true">→</span>
          </Link>
        </div>

        <KnotStage
          knot={firstKnot}
          player={player}
          physics={physicsFromParams(new URLSearchParams())}
          className={styles.stage}
        />
      </section>

      {onBrowseKnots && (
        <div className={styles.actionWrap}>
          <button type="button" className={styles.exploreBtn} onClick={onBrowseKnots}>
            Browse Knots
          </button>
        </div>
      )}
    </div>
  );
}
