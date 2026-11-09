import * as THREE from "three";
import type { KnotSession } from "../session";
import { createRopeMaterial } from "./ropeMaterial";
import { RopeMesh } from "./ropeMesh";
import { createPropMesh, createStage, type Stage } from "./stage";

export const NATURAL_ROPE = "#c39f6a";

/**
 * Draws a knot session on a canvas: owns the three.js stage and the render loop, ticks the
 * session's player and redraws only when the rope or the view changed. Show another session to
 * switch knots.
 */
export class KnotViewer {
  private readonly stage: Stage;
  private readonly materials = new Map<string, THREE.Material>();
  private readonly clock = new THREE.Timer();
  private session: KnotSession | null = null;
  private ropes: RopeMesh[] = [];
  private props: THREE.Mesh[] = [];
  private firstDraw: (() => void) | null = null;
  /** Time of the frame the ropes show; NaN until the session's first frame is built. */
  private shownTime = NaN;

  constructor(canvas: HTMLCanvasElement) {
    this.stage = createStage(canvas);
    this.stage.renderer.setAnimationLoop((now) => this.frame(now));
  }

  /** Replaces what is shown; the previous session stays the caller's to dispose. */
  show(session: KnotSession, onFirstDraw?: () => void) {
    this.clear();
    this.session = session;
    this.firstDraw = onFirstDraw ?? null;
    const { knot, timeline } = session;
    const anisotropy = this.stage.renderer.capabilities.getMaxAnisotropy();
    this.ropes = knot.ropes.map((def, k) => {
      const color = def.color ?? NATURAL_ROPE;
      if (!this.materials.has(color))
        this.materials.set(color, createRopeMaterial(color, anisotropy));
      const mesh = new RopeMesh(timeline.counts[k], def, this.materials.get(color)!);
      this.stage.scene.add(mesh);
      return mesh;
    });
    this.props = (knot.props ?? []).map(createPropMesh);
    for (const prop of this.props) this.stage.scene.add(prop);
  }

  resetView() {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.stage.resetView(performance.now(), reduce);
  }

  isDefaultView = () => this.stage.isDefaultView();

  onViewChange = (listener: () => void) => this.stage.onViewChange(listener);

  dispose() {
    this.stage.renderer.setAnimationLoop(null);
    this.clear();
    for (const material of this.materials.values()) material.dispose();
    this.stage.dispose();
  }

  private frame(now: number) {
    this.clock.update(now);
    const session = this.session;
    let changed = false;
    if (session) {
      session.player.tick(this.clock.getDelta());
      const { timeline } = session;
      // Clamped as sample() clamps it: while playback waits at the bake edge, the drawn frame
      // still moves as the edge does. Baked frames never change, so the same time is the same rope.
      const time = Math.min(Math.max(session.player.getSnapshot().time, 0), timeline.ready);
      if (time !== this.shownTime) {
        this.shownTime = time;
        changed = true;
        const { positions, normals } = timeline.sample(time);
        let o = 0;
        this.ropes.forEach((rope, k) => {
          const end = o + timeline.counts[k] * 3;
          rope.update(positions.subarray(o, end), normals.subarray(o, end));
          o = end;
        });
      }
    }
    const drawn = this.stage.render(now, changed);
    if (session && drawn && this.firstDraw) {
      this.firstDraw();
      this.firstDraw = null;
    }
  }

  /** Removes the shown ropes and props and frees what is theirs; rope materials are shared and kept. */
  private clear() {
    const shared = new Set(this.materials.values());
    for (const object of [...this.ropes, ...this.props]) {
      this.stage.scene.remove(object);
      object.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        for (const m of [o.material].flat()) if (!shared.has(m)) m.dispose();
      });
    }
    this.ropes = [];
    this.props = [];
    this.session = null;
    this.shownTime = NaN;
  }
}
