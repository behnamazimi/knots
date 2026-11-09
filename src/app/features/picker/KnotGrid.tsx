import { useState } from "react";
import { Link } from "react-router";
import type { KnotDef } from "../../../engine/knots/types";
import { JOBS, KNOT_INFO } from "../../shared/knotInfo";
import { knotImagePath, knotPath } from "../../shared/site";
import { PlayIcon } from "../../shared/ui/icons";
import styles from "./grid.module.css";

const seconds = (s: number) => `${Math.round(s * 10) / 10} s`;

/** Every knot as a card, with a row of jobs to narrow them. Filtered-out cards are hidden, not removed. */
export function KnotGrid({ knots }: { knots: KnotDef[] }) {
  const [job, setJob] = useState<string>("all");
  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filter by job">
        {JOBS.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={job === id} onClick={() => setJob(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {knots.map((k) => (
          <Link
            key={k.id}
            to={knotPath(k.id)}
            className={styles.card}
            hidden={job !== "all" && KNOT_INFO[k.id].job !== job}
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
              <span className={styles.badge}>
                <PlayIcon />
                {seconds(k.duration)}
              </span>
            </div>
            <div className={styles.body}>
              <h3>{k.name}</h3>
              <p>{KNOT_INFO[k.id].line}</p>
              <span className={styles.meta}>
                {k.steps.length} steps{k.ropes.length > 1 ? ` · ${k.ropes.length} ropes` : ""}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
