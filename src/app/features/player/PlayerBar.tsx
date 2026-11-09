import { type ReactNode, useSyncExternalStore } from "react";
import type { KnotDef } from "../../../engine/knots/types";
import type { Player } from "../../../engine/playback/player";
import { useMountEffect } from "../../shared/hooks";
import { LoopIcon, PauseIcon, PlayIcon } from "../../shared/ui/icons";
import styles from "./player.module.css";

const SPEEDS = [
  { value: 0.25, label: "¼×" },
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
];

/**
 * The current step and the playback bar for a knot's player; also wires the keyboard shortcuts.
 * `extra` goes at the end of the bar, after the loop button.
 */
export function PlayerBar({
  player,
  steps,
  extra,
}: {
  player: Player;
  steps: KnotDef["steps"];
  extra?: ReactNode;
}) {
  const s = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);
  const time = Math.min(s.time, s.duration);
  const percent = (t: number) => `${(t / s.duration) * 100}%`;
  useKeyboardShortcuts(player);

  return (
    <section className={styles.player} aria-label="Playback" data-baked={s.ready >= s.duration}>
      <p className={styles.step}>
        <span className={styles.stepNum}>
          {s.step + 1}/{steps.length}
        </span>
        <span aria-live="polite">{steps[s.step].title}</span>
      </p>
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.play}
          aria-label={s.playing ? "Pause" : "Play"}
          aria-pressed={s.playing}
          onClick={player.togglePlay}
        >
          {s.playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className={styles.track}>
          <div className={styles.rail}>
            <div className={styles.ready} style={{ width: percent(s.ready) }} />
            <div className={styles.played} style={{ width: percent(time) }} />
          </div>
          <ol className={styles.ticks}>
            {steps.map((step, i) => (
              <li key={step.t}>
                <button
                  type="button"
                  style={{ left: percent(step.t) }}
                  aria-label={`Step ${i + 1}: ${step.title}`}
                  title={step.title}
                  aria-current={i === s.step ? "step" : undefined}
                  onClick={() => player.seek(step.t)}
                />
              </li>
            ))}
          </ol>
          <input
            className={styles.scrub}
            type="range"
            min={0}
            max={s.duration}
            step={0.01}
            value={time}
            aria-label="Timeline"
            aria-valuetext={`${time.toFixed(1)} of ${s.duration.toFixed(1)} seconds`}
            onChange={(e) => player.seek(Number(e.target.value))}
          />
        </div>
        <span className={styles.clock}>{time.toFixed(1)}s</span>
        <div className={styles.speed} role="radiogroup" aria-label="Playback speed">
          {SPEEDS.map(({ value, label }) => (
            <label key={value}>
              <input
                type="radio"
                name="speed"
                value={value}
                checked={s.speed === value}
                onChange={() => player.setSpeed(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          className={styles.loop}
          aria-label="Loop playback"
          aria-pressed={s.loop}
          onClick={player.toggleLoop}
        >
          <LoopIcon />
        </button>
        {extra}
      </div>
    </section>
  );
}

/** Space plays or pauses, the arrow keys step back and forth; focused controls keep their own keys. */
function useKeyboardShortcuts(player: Player) {
  useMountEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
      if (e.key === " ") {
        e.preventDefault();
        player.togglePlay();
      } else if (e.key === "ArrowRight") player.stepBy(1);
      else if (e.key === "ArrowLeft") player.stepBy(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
}
