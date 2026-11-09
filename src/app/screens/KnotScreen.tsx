import { flushSync } from "react-dom";
import { useState, useSyncExternalStore } from "react";
import { Link, useSearchParams } from "react-router";
import { knots } from "../../engine/knots";
import type { KnotDef } from "../../engine/knots/types";
import { Player } from "../../engine/playback/player";
import { physicsFromParams } from "../features/tuner";
import { KNOT_INFO } from "../shared/knotInfo";
import { REPO_URL, knotPath } from "../shared/site";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  InfoIcon,
  ListIcon,
  WarningIcon,
} from "../shared/ui/icons";
import { SiteFooter, SiteHeader, linkClass } from "../shared/ui/SiteChrome";
import { KnotStage } from "./KnotStage";
import styles from "./KnotScreen.module.css";

/** A knot's whole page: the sticky live view beside its name, uses, steps and related knots. */
export function KnotScreen({ knot }: { knot: KnotDef }) {
  const [params] = useSearchParams();
  const physics = physicsFromParams(params);
  // A new knot or rope material starts a fresh session (viewer, bake, player) by remounting.
  return <Session key={`${knot.id} ${JSON.stringify(physics)}`} knot={knot} physics={physics} />;
}

function Session({
  knot,
  physics,
}: {
  knot: KnotDef;
  physics: ReturnType<typeof physicsFromParams>;
}) {
  // Plain data, so the prerendered page shows the same first step and duration as the browser.
  const [player] = useState(() => Player.forKnot(knot));
  const [wide, setWide] = useState(false);
  // Morph the stage between layouts where the browser can; otherwise just switch.
  const toggleWide = () => {
    const swap = () => flushSync(() => setWide((w) => !w));
    if (document.startViewTransition) document.startViewTransition(swap);
    else swap();
  };
  const info = KNOT_INFO[knot.id];

  return (
    <div className="site">
      <SiteHeader />
      <main className={styles.page}>
        <div className={`${styles.cols} ${wide ? styles.wideCols : ""}`}>
          <article className={styles.article}>
            <Link className={styles.back} to="/">
              <ChevronLeftIcon />
              All knots
            </Link>
            <h1 className={styles.title}>{knot.name}</h1>
            <p className={styles.lead}>{knot.summary}</p>
            <dl className={styles.facts}>
              {[
                ["Type", info.type],
                ["Steps", String(knot.steps.length)],
                ["Time", `${Math.round(knot.duration * 10) / 10} s`],
                ["Ropes", String(knot.ropes.length)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <section className={styles.section}>
              <h2>
                <CheckIcon />
                What it’s for
              </h2>
              <ul className={`${styles.list} ${styles.uses}`}>
                {info.uses.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </section>
            <section className={styles.section}>
              <h2>
                <InfoIcon />
                Good to know
              </h2>
              <p>{info.watch}</p>
            </section>
            <section className={styles.section}>
              <h2>
                <ListIcon />
                How to tie it
              </h2>
              <StepList knot={knot} player={player} />
            </section>
            <section className={styles.section}>
              <h2>
                <ArrowRightIcon />
                Related knots
              </h2>
              <div className={styles.related}>
                {info.related.map((id) => (
                  <Link key={id} className={linkClass} to={knotPath(id)}>
                    {knots.find((k) => k.id === id)?.name}
                  </Link>
                ))}
              </div>
            </section>
            <section className={styles.section}>
              <h2>
                <WarningIcon />
                Before you rely on it
              </h2>
              <p>
                The rope here is simulated. Real rope differs in stiffness, friction and size, so
                practise with real rope and check the result by hand. Do not rely on a knot learned
                here where a failure could hurt someone.
              </p>
              <p className={styles.small}>
                Written for this site and not yet checked against a published knot reference. Spot a
                mistake?{" "}
                <a
                  className={linkClass}
                  href={`${REPO_URL}/blob/main/src/engine/knots/${knot.id}.ts`}
                  target="_blank"
                  rel="noopener"
                >
                  Improve this knot on GitHub
                </a>
                .
              </p>
            </section>
          </article>
          <KnotStage
            knot={knot}
            player={player}
            physics={physics}
            className={styles.stage}
            wide={wide}
            onToggleWide={toggleWide}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** The steps as a list; the current one is marked, and a click plays from there. */
function StepList({ knot, player }: { knot: KnotDef; player: Player }) {
  const { step } = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);
  return (
    <ol className={`${styles.list} ${styles.steps}`}>
      {knot.steps.map((s, i) => (
        <li key={s.t} aria-current={i === step ? "step" : undefined}>
          <button
            type="button"
            onClick={() => {
              player.seek(s.t);
              player.play();
            }}
          >
            <i>{i + 1}</i>
            <span>{s.title}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
