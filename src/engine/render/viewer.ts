import * as THREE from "three";
import type { KnotDef } from "../knots/types";
import type { Player } from "../playback/player";
import { Timeline } from "../playback/timeline";
import { DEFAULT_PHYSICS, type RopePhysics } from "../sim/rope";
import { createRopeMaterial } from "./ropeMaterial";
import { RopeMesh } from "./ropeMesh";
import { createPropMesh, createStage, type Stage } from "./stage";

export const NATURAL_ROPE = "#c39f6a";

export interface KnotViewerOptions {
  stage?: Stage;
  batterySaver?: boolean;
  lowDensity?: boolean;
}

export interface ShowKnotOptions {
  physics?: RopePhysics;
  autoPlay?: boolean;
  lowDensity?: boolean;
  onFirstDraw?: () => void;
}

/**
 * Draws a knot on a canvas: owns the three.js stage, the Timeline bake, and the render loop,
 * ticks the player and redraws only when the rope or the view changed. Call `show()` to switch knots.
 */
export class KnotViewer {
  private readonly stage: Stage;
  private readonly lowDensity: boolean;
  private readonly materials = new Map<string, THREE.Material>();
  private readonly clock = new THREE.Timer();
  private timeline: Timeline | null = null;
  private player: Player | null = null;
  private autoPlayUnsubscribe: (() => void) | null = null;
  private ropes: RopeMesh[] = [];
  private props: THREE.Mesh[] = [];
  private firstDraw: (() => void) | null = null;
  /** Time of the frame the ropes show; NaN until the knot's first frame is built. */
  private shownTime = NaN;

  constructor(canvas: HTMLCanvasElement, options?: KnotViewerOptions) {
    this.stage = options?.stage ?? createStage(canvas, { batterySaver: options?.batterySaver });
    this.lowDensity = Boolean(options?.lowDensity);
    this.stage.renderer.setAnimationLoop((now) => this.frame(now));
  }

  /** Bakes and displays `knot`, wiring progress to `player`; disposes any previously shown knot. */
  show(knot: KnotDef, player: Player, options?: ShowKnotOptions) {
    this.clear();
    this.player = player;
    this.firstDraw = options?.onFirstDraw ?? null;

    const timeline = new Timeline(
      knot,
      () => {
        if (this.timeline === timeline) player.setReady(timeline.ready);
      },
      options?.physics ?? DEFAULT_PHYSICS,
    );
    this.timeline = timeline;

    if (options?.autoPlay) {
      const maybePlay = () => {
        if (timeline.ready >= 0.4 || timeline.ready >= timeline.duration) {
          player.play();
          this.autoPlayUnsubscribe?.();
          this.autoPlayUnsubscribe = null;
          return true;
        }
        return false;
      };
      if (!maybePlay()) {
        this.autoPlayUnsubscribe = player.subscribe(maybePlay);
      }
    }

    const lowDensity = options?.lowDensity ?? this.lowDensity;
    const anisotropy = this.stage.renderer.capabilities.getMaxAnisotropy();
    this.ropes = knot.ropes.map((def, k) => {
      const color = def.color ?? NATURAL_ROPE;
      if (!this.materials.has(color))
        this.materials.set(color, createRopeMaterial(color, anisotropy));
      const mesh = new RopeMesh(timeline.counts[k], def, this.materials.get(color)!, {
        lowDensity,
      });
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

  /** Removes the shown ropes, props, timeline, and auto-play subscription; shared materials are kept. */
  clear() {
    this.autoPlayUnsubscribe?.();
    this.autoPlayUnsubscribe = null;
    this.timeline?.dispose();
    this.timeline = null;
    this.player = null;
    this.firstDraw = null;
    for (const rope of this.ropes) {
      this.stage.scene.remove(rope);
      rope.dispose();
    }
    for (const prop of this.props) {
      this.stage.scene.remove(prop);
      prop.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        for (const m of [o.material].flat()) m.dispose();
      });
    }
    this.ropes = [];
    this.props = [];
    this.shownTime = NaN;
  }

  pauseLoop() {
    this.stage.renderer.setAnimationLoop(null);
  }

  dispose() {
    this.pauseLoop();
    this.clear();
    for (const material of this.materials.values()) {
      if (material instanceof THREE.MeshPhysicalMaterial) {
        material.map?.dispose();
        material.normalMap?.dispose();
      }
      material.dispose();
    }
    this.stage.dispose();
  }

  private frame(now: number) {
    this.clock.update(now);
    const timeline = this.timeline;
    const player = this.player;
    let changed = false;
    if (timeline && player) {
      player.tick(this.clock.getDelta());
      // Clamped as sample() clamps it: while playback waits at the bake edge, the drawn frame
      // still moves as the edge does. Baked frames never change, so the same time is the same rope.
      const time = Math.min(Math.max(player.getSnapshot().time, 0), timeline.ready);
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
    if (timeline && drawn && this.firstDraw) {
      this.firstDraw();
      this.firstDraw = null;
    }
  }
}
