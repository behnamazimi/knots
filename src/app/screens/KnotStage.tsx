import { useState } from "react";
import type { KnotDef } from "../../engine/knots/types";
import type { Player } from "../../engine/playback/player";
import type { KnotViewer } from "../../engine/render/viewer";
import { createKnotSession } from "../../engine/session";
import { PlayerBar, ShareButton } from "../features/player";
import { Tuner, type physicsFromParams } from "../features/tuner";
import { ResetViewButton, ViewerCanvas, type StartViewer } from "../features/viewer";
import { ExpandIcon } from "../shared/ui/icons";
import { knotImagePath, knotPath } from "../shared/site";
import styles from "./KnotStage.module.css";

/** One knot's live view with its player bar. Remount (key) it to start another knot. */
export function KnotStage({
  knot,
  player,
  physics,
  className,
  wide,
  onToggleWide,
}: {
  knot: KnotDef;
  player: Player;
  physics: ReturnType<typeof physicsFromParams>;
  className?: string;
  wide?: boolean;
  onToggleWide?: () => void;
}) {
  const [viewer, setViewer] = useState<KnotViewer | null>(null);
  const start: StartViewer = (viewer, onDrawn) => {
    const session = createKnotSession(knot, player, physics);
    viewer.show(session, onDrawn);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) player.play();
    return session.dispose;
  };

  return (
    <div className={`${styles.stage} ${className ?? ""}`}>
      <ViewerCanvas poster={knotImagePath(knot.id)} start={start} onViewer={setViewer} />
      <span className={styles.hint}>Drag to turn · scroll or pinch to zoom</span>
      {onToggleWide && (
        <button
          type="button"
          className={styles.wide}
          aria-label={wide ? "Narrow view" : "Full width"}
          aria-pressed={wide}
          title={wide ? "Narrow view" : "Full width"}
          onClick={onToggleWide}
        >
          <ExpandIcon />
        </button>
      )}
      <PlayerBar
        player={player}
        steps={knot.steps}
        extra={
          <>
            <ShareButton name={knot.name} path={knotPath(knot.id)} />
            <ResetViewButton viewer={viewer} />
          </>
        }
      />
      <Tuner />
    </div>
  );
}
