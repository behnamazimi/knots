import { useState } from "react";
import { Link } from "react-router";
import { knots } from "../../engine/knots";
import { Player } from "../../engine/playback/player";
import { KnotGrid } from "../features/picker";
import { StargazerStrip } from "../features/stargazers";
import { physicsFromParams } from "../features/tuner";
import { REPO_URL, STARGAZERS_DATA, knotPath } from "../shared/site";
import { SiteFooter, SiteHeader } from "../shared/ui/SiteChrome";
import { KnotStage } from "./KnotStage";
import styles from "./HomeScreen.module.css";

const NUMBERS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];
const first = knots[0];

/** The front page: a live knot to watch, then every knot by the job it does, then the stargazer rope. */
export function HomeScreen() {
  const [player] = useState(() => Player.forKnot(first));
  const count = NUMBERS[knots.length] ?? String(knots.length);
  return (
    <div className="site">
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.hero} aria-label="A knot being tied">
          <div className={styles.text}>
            <h1>
              {count} knots, tied slowly enough to follow.
              <span>
                Each one is tied on a simulated rope you can turn, pause and scrub, one step at a
                time.
              </span>
            </h1>
            <p className={styles.honest}>
              This is not a video. Invisible hands pull a few points of a simulated rope, and
              physics does the rest. Drag it to look around.
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
