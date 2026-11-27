import type { KnotDef } from "../knots/types";
import { frameCount } from "../sim/bake";
import { FPS } from "../sim/rope";

const LOOP_REST = 1.2; // seconds to show the finished knot before looping

export interface PlayerSnapshot {
  /** Seconds into the knot; may run past `duration` while the finished knot rests before a loop. */
  time: number;
  /** Seconds baked so far; playback waits here. */
  ready: number;
  duration: number;
  playing: boolean;
  loop: boolean;
  speed: number;
  /** Index into the knot's steps at `time`. */
  step: number;
}

/**
 * Playback state of one knot, without any rendering or framework. The render loop calls `tick`;
 * UI reads it with `subscribe`/`getSnapshot` (fits React's useSyncExternalStore) and calls the actions.
 */
export class Player {
  private snapshot: PlayerSnapshot;
  private readonly listeners = new Set<() => void>();

  /** Starts paused at the first step with nothing baked, the same on the server and in the browser. */
  constructor(
    private readonly steps: KnotDef["steps"],
    duration: number,
  ) {
    this.snapshot = { time: 0, ready: 0, duration, playing: false, loop: false, speed: 1, step: 0 };
  }

  static forKnot(knot: KnotDef) {
    return new Player(knot.steps, (frameCount(knot) - 1) / FPS);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  togglePlay = () => {
    const { playing, time, duration } = this.snapshot;
    this.set({ playing: !playing, time: !playing && time >= duration ? 0 : time });
  };

  play = () => this.set({ playing: true });

  pause = () => this.set({ playing: false });

  seek = (time: number) => this.set({ time: Math.min(Math.max(time, 0), this.snapshot.duration) });

  /** Jumps to the start of the next (+1) or previous (-1) step. */
  stepBy = (delta: number) => {
    const i = Math.min(Math.max(this.snapshot.step + delta, 0), this.steps.length - 1);
    this.seek(this.steps[i].t);
  };

  setSpeed = (speed: number) => this.set({ speed });

  toggleLoop = () => this.set({ loop: !this.snapshot.loop });

  setReady = (ready: number) => this.set({ ready });

  /** Advances by `dt` seconds of wall time, waiting at the edge of what has been baked. */
  tick(dt: number) {
    const { playing, ready, duration, loop, speed } = this.snapshot;
    // The first frame's step can be negative (its timestamp predates the clock's start).
    if (!playing || dt <= 0) return;
    const limit = ready < duration ? ready : duration + LOOP_REST;
    const time = Math.min(this.snapshot.time + dt * speed, limit);
    if (time >= duration + (loop ? LOOP_REST : 0)) {
      this.set(loop ? { time: 0 } : { time: duration, playing: false });
    } else this.set({ time });
  }

  private set(patch: Partial<PlayerSnapshot>) {
    const next = { ...this.snapshot, ...patch };
    next.step = this.stepAt(next.time);
    if (
      Object.keys(next).every(
        (k) => next[k as keyof PlayerSnapshot] === this.snapshot[k as keyof PlayerSnapshot],
      )
    )
      return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  private stepAt(time: number) {
    let i = 0;
    while (i < this.steps.length - 1 && time >= this.steps[i + 1].t) i++;
    return i;
  }
}
