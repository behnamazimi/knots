import { useState } from "react";
import { Link } from "react-router";
import { knots } from "../../engine/knots";
import { Player } from "../../engine/playback/player";
import { KnotGrid } from "../features/picker";
import { StargazerStrip } from "../features/stargazers";
import { physicsFromParams } from "../features/tuner";
import { useMountEffect } from "../shared/hooks";
import { platform } from "../shared/platformBridge";
import { getThemePreference } from "../shared/settings";
import { REPO_URL, STARGAZERS_DATA, knotPath } from "../shared/site";
import { SiteFooter, SiteHeader } from "../shared/ui/SiteChrome";
import { KnotStage } from "./KnotStage";
import styles from "./HomeScreen.module.css";

const first = knots[0];

/** Standard web browser home page with hero 3D stage, knot grid, and stargazers. */
export function WebHomeScreen() {
  const [player] = useState(() => Player.forKnot(first));

  useMountEffect(() => {
    let animId: number;
    const handle = requestAnimationFrame(() => {
      animId = requestAnimationFrame(() => {
        try {
          platform.notifyAppReady(getThemePreference());
        } catch {}
      });
    });

    const preloadKnotRoute = () => {
      import("../routes/knot").catch(() => {});
      import("../../engine/render/viewer").catch(() => {});
    };
    if ("requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
        preloadKnotRoute,
      );
    } else {
      setTimeout(preloadKnotRoute, 200);
    }

    return () => {
      cancelAnimationFrame(handle);
      cancelAnimationFrame(animId);
    };
  });

  return (
    <div className="site">
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.hero} aria-label="A knot being tied">
          <div className={styles.text}>
            <h1>
              Knots, tied slowly
              <br />
              enough to follow.
            </h1>
            <p>
              Watch each knot tie itself on a simulated rope. Turn it, pause it, drag through the
              steps.
            </p>
            <p className={styles.honest}>
              Not a video. Invisible hands pull a few points of the rope and physics does the rest.
              Drag to look around.
            </p>
            <Link className={styles.go} to={knotPath(first.id)}>
              How to tie the {first.name.toLowerCase()} <span aria-hidden="true">→</span>
            </Link>
          </div>

          <KnotStage
            knot={first}
            player={player}
            physics={physicsFromParams(new URLSearchParams())}
            className={styles.stage}
          />
        </section>

        <KnotGrid knots={knots} />

        <StargazerStrip src={STARGAZERS_DATA} repoUrl={REPO_URL} />
      </main>

      <SiteFooter />
    </div>
  );
}
