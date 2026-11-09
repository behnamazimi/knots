import { useRef, useState, useSyncExternalStore } from "react";
import {
  DURATIONS,
  GRIPS,
  KnotRecorder,
  type Grip,
  type RecorderSnapshot,
} from "../../../engine/render/recorder";
import { PRESETS } from "../../../engine/record/recording";
import { useMountEffect } from "../../shared/hooks";
import {
  CloseIcon,
  CopyIcon,
  DragIcon,
  FoldIcon,
  LetGoIcon,
  PlayIcon,
  RedoIcon,
  ReplayIcon,
  UndoIcon,
  WaitIcon,
} from "../../shared/ui/icons";
import styles from "./recorder.module.css";

const SPEEDS = [1, 0.5, 0.25];
const noRecorder = () => () => {};

/**
 * The knot playground: put hands on the rope, plan where they go, play the move, and get the
 * whole thing as a knot's guides.
 */
export function Recorder() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [recorder, setRecorder] = useState<KnotRecorder | null>(null);
  useMountEffect(() => {
    const r = new KnotRecorder(canvas.current!);
    setRecorder(r);
    return () => r.dispose();
  });
  const state = useSyncExternalStore(
    recorder?.subscribe ?? noRecorder,
    () => recorder?.getSnapshot() ?? null,
    () => null,
  );

  return (
    <>
      <canvas ref={canvas} className={styles.scene} aria-label="Rope you can tie with hands" />
      {recorder && state && <Panel recorder={recorder} state={state} />}
    </>
  );
}

const PANEL_KEY = "knot-recorder-panel";

/** Where the panel was dragged to, kept across reloads; null for its corner. */
function loadPlace(): { x: number; y: number } | null {
  try {
    return JSON.parse(localStorage.getItem(PANEL_KEY) ?? "null");
  } catch {
    return null;
  }
}

function Panel({ recorder, state }: { recorder: KnotRecorder; state: RecorderSnapshot }) {
  const idle = !state.busy;
  const [place, setPlace] = useState(loadPlace);
  const [folded, setFolded] = useState(false);
  const grab = useRef<{ dx: number; dy: number } | null>(null);

  const startDrag = (e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as Element).closest("button")) return;
    const box = e.currentTarget.parentElement!.getBoundingClientRect();
    grab.current = { dx: e.clientX - box.left, dy: e.clientY - box.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const drag = (e: React.PointerEvent<HTMLElement>) => {
    if (!grab.current) return;
    const box = e.currentTarget.parentElement!.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - grab.current.dx), innerWidth - box.width);
    const y = Math.min(Math.max(0, e.clientY - grab.current.dy), innerHeight - 40);
    setPlace({ x, y });
  };
  const endDrag = () => {
    if (!grab.current) return;
    grab.current = null;
    try {
      localStorage.setItem(PANEL_KEY, JSON.stringify(place));
    } catch {
      // The panel just goes back to its corner on reload.
    }
  };

  return (
    <section
      className={styles.panel}
      aria-label="Knot playground"
      style={
        place
          ? {
              left: place.x,
              top: place.y,
              right: "auto",
              bottom: "auto",
              maxHeight: `calc(100dvh - ${place.y + 16}px)`,
            }
          : undefined
      }
    >
      <header
        className={styles.titleBar}
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        title="Drag to move the panel"
      >
        <DragIcon />
        <h2>Knot playground</h2>
        <button
          type="button"
          className={styles.icon}
          aria-label={folded ? "Unfold the panel" : "Fold the panel"}
          aria-expanded={!folded}
          onClick={() => setFolded(!folded)}
        >
          <FoldIcon className={folded ? styles.flipped : undefined} />
        </button>
      </header>

      <div className={styles.toolbar} role="toolbar" aria-label="Moves">
        <Tool label="Play move (Space)" primary disabled={!idle} onClick={() => recorder.play()}>
          <PlayIcon />
        </Tool>
        <Tool label="Wait ½ s" disabled={!idle} onClick={() => recorder.wait()}>
          <WaitIcon />
        </Tool>
        <Tool
          label="Let go of the selected hand (Backspace)"
          disabled={!idle || state.selected === null}
          onClick={() => recorder.letGo()}
        >
          <LetGoIcon />
        </Tool>
        <span className={styles.gap} />
        <Tool label="Undo (⌘Z)" disabled={!idle || !state.canUndo} onClick={() => recorder.undo()}>
          <UndoIcon />
        </Tool>
        <Tool label="Redo (⇧⌘Z)" disabled={!idle || !state.canRedo} onClick={() => recorder.redo()}>
          <RedoIcon />
        </Tool>
        {state.busy === "replay" ? (
          <Tool label="Back to editing" onClick={() => recorder.stopReplay()}>
            <CloseIcon />
          </Tool>
        ) : (
          <Tool
            label="Replay all, as it will look on the site"
            disabled={!idle || !state.moves}
            onClick={() => recorder.replay()}
          >
            <ReplayIcon />
          </Tool>
        )}
        <Tool label="Copy code" onClick={() => navigator.clipboard.writeText(state.code)}>
          <CopyIcon />
        </Tool>
      </div>

      <p className={styles.hint}>{hint(state)}</p>

      {!folded && (
        <>
          <p className={styles.status}>
            <span>{state.time.toFixed(2)} s</span>
            <span>{state.moves} hands used</span>
            {state.busy && <span className={styles.busy}>{state.busy}…</span>}
          </p>

          {state.hands.length > 0 && (
            <ol className={styles.hands}>
              {state.hands.map((h, i) => (
                <li key={h.id} aria-current={h.id === state.selected}>
                  <button type="button" onClick={() => recorder.select(h.id)}>
                    Hand {i + 1} · {h.grip}
                    {h.planned && " · planned"}
                  </button>
                  <Tool
                    label={`Let go of hand ${i + 1}`}
                    disabled={!idle}
                    onClick={() => recorder.letGo(h.id)}
                  >
                    <LetGoIcon />
                  </Tool>
                </li>
              ))}
            </ol>
          )}

          {state.plan && (
            <fieldset className={styles.coords}>
              <legend>Selected hand goes to (cm)</legend>
              {(["X", "Height", "Z"] as const).map((name, axis) => (
                <label key={name}>
                  {name}
                  <input
                    type="number"
                    step={0.5}
                    disabled={!idle}
                    value={Number((state.plan![axis] * 100).toFixed(1))}
                    onChange={(e) =>
                      recorder.setPlan(axis as 0 | 1 | 2, Number(e.target.value) / 100)
                    }
                  />
                </label>
              ))}
            </fieldset>
          )}

          <Choice
            label="Move takes"
            options={DURATIONS}
            value={state.duration}
            format={(s) => `${s} s`}
            onChange={(s) => recorder.setDuration(s)}
          />
          <Choice
            label="Grip of new hands"
            options={Object.keys(GRIPS) as Grip[]}
            value={state.grip}
            onChange={(g) => recorder.setGrip(g)}
          />
          <Choice
            label="Play speed"
            options={SPEEDS}
            value={state.speed}
            format={(s) => `${s}×`}
            onChange={(s) => recorder.setSpeed(s)}
          />

          <StepForm onMark={(title) => recorder.markStep(title)} />

          <label>
            Start from
            <select
              value={state.preset}
              disabled={!idle}
              onChange={(e) =>
                (state.moves === 0 || confirm("Start over? The recording will be cleared.")) &&
                recorder.setPreset(e.target.value)
              }
            >
              {PRESETS.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!idle || !state.moves}
            onClick={() => confirm("Clear the recording?") && recorder.clear()}
          >
            Clear and start over
          </button>

          <details>
            <summary>How it works</summary>
            <ul>
              <li>
                Click the rope to put a hand on it. A hand holds its point until you let it go.
              </li>
              <li>
                Time is stopped while you plan. Drag a hand's dot across the table; drag the arrow
                above the selected dot (or press W/S) to lift or lower it. The line under a dot
                shows its height. Plan as many hands as you like.
              </li>
              <li>
                Play (Space) takes every hand to its dot together, over the move time. A faint dot
                shows where a hand still is.
              </li>
              <li>Let go opens the hand during the next move or wait.</li>
              <li>
                Undo and redo are exact. Replay all shows the move as it will look on the site.
              </li>
              <li>
                Firm or Pull grip for hands that tighten. Drag the empty table to turn the view.
              </li>
              <li>
                Keys 1–9 select a hand. Drag the panel by its title; fold it to see more rope.
              </li>
            </ul>
          </details>
          <details>
            <summary>Code</summary>
            <textarea readOnly value={state.code} rows={12} />
          </details>
        </>
      )}
    </section>
  );
}

function Tool({
  label,
  primary,
  disabled,
  onClick,
  children,
}: {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={primary ? `${styles.icon} ${styles.primary}` : styles.icon}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function hint(state: RecorderSnapshot): string {
  if (state.busy === "replay") return "Replaying everything from the start.";
  if (state.busy) return "Playing the move…";
  if (!state.hands.length) return "Click the rope to put a hand on it.";
  if (state.hands.some((h) => h.planned))
    return "Plan more hands if you like, then press Play (Space).";
  return "Drag a dot to move its hand, or its arrow to lift it. Click the rope for another hand.";
}

function Choice<T extends string | number>({
  label,
  options,
  value,
  format = String,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  format?: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className={styles.choice}>
      <legend>{label}</legend>
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={o === value} onClick={() => onChange(o)}>
          {format(o)}
        </button>
      ))}
    </fieldset>
  );
}

function StepForm({ onMark }: { onMark: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className={styles.row}
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onMark(title.trim());
        setTitle("");
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Step title, from now"
        aria-label="Step title"
      />
      <button type="submit" disabled={!title.trim()}>
        Mark step
      </button>
    </form>
  );
}
