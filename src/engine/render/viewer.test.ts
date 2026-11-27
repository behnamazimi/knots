import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { KnotDef } from "../knots/types";
import { Player } from "../playback/player";
import { RopeMesh } from "./ropeMesh";
import type { Stage } from "./stage";
import { KnotViewer } from "./viewer";

const timelines: Array<{
  ready: number;
  duration: number;
  emitProgress: (ready: number) => void;
  dispose: ReturnType<typeof vi.fn>;
}> = [];

vi.mock("../playback/timeline", () => ({
  Timeline: class {
    counts: number[];
    ready = 0;
    duration: number;
    dispose = vi.fn();
    private onProgress: () => void;

    constructor(knot: KnotDef, onProgress: () => void) {
      this.counts = knot.ropes.map(() => 10);
      this.duration = knot.duration;
      this.onProgress = onProgress;
      timelines.push(this);
    }

    sample = () => ({ positions: new Float32Array(30), normals: new Float32Array(30) });

    emitProgress(ready: number) {
      this.ready = ready;
      this.onProgress();
    }
  },
}));

function makeFakeStage(): Stage {
  const scene = new THREE.Scene();
  return {
    renderer: {
      setAnimationLoop: vi.fn(),
      capabilities: { getMaxAnisotropy: () => 1 },
    } as unknown as THREE.WebGLRenderer,
    scene,
    camera: new THREE.PerspectiveCamera(),
    controls: {} as Stage["controls"],
    render: vi.fn(() => false),
    resetView: vi.fn(),
    isDefaultView: () => true,
    onViewChange: () => () => false,
    dispose: vi.fn(),
  };
}

function makeKnot(duration = 4, color = "#c39f6a"): KnotDef {
  return {
    id: "test-knot",
    name: "Test Knot",
    summary: "Test",
    duration,
    ropes: [
      {
        length: 1,
        radius: 0.02,
        color,
        start: [
          [0, 0, 0],
          [1, 0, 0],
        ],
      },
    ],
    steps: [],
    guides: [],
  };
}

describe("RopeMesh & KnotViewer", () => {
  afterEach(() => {
    timelines.length = 0;
    vi.restoreAllMocks();
  });

  it("RopeMesh.dispose() disposes cut-face texture, child materials, and child geometries without disposing shared material", () => {
    const sharedMaterial = new THREE.MeshPhysicalMaterial();
    const sharedMatDisposed = vi.fn();
    sharedMaterial.addEventListener("dispose", sharedMatDisposed);

    const mesh = new RopeMesh(10, { length: 1, radius: 0.02 }, sharedMaterial);

    const disposedGeometries = new Set<THREE.BufferGeometry>();
    const disposedMaterials = new Set<THREE.Material>();
    const disposedTextures = new Set<THREE.Texture>();

    mesh.traverse((obj) => {
      if ("geometry" in obj && obj.geometry instanceof THREE.BufferGeometry) {
        const geom = obj.geometry;
        geom.addEventListener("dispose", () => disposedGeometries.add(geom));
      }
      if ("material" in obj && obj.material) {
        for (const mat of [obj.material].flat() as THREE.Material[]) {
          if (mat === sharedMaterial) continue;
          mat.addEventListener("dispose", () => disposedMaterials.add(mat));
          if ("map" in mat && mat.map instanceof THREE.Texture) {
            const tex = mat.map;
            tex.addEventListener("dispose", () => disposedTextures.add(tex));
          }
        }
      }
    });

    mesh.dispose();

    expect(disposedTextures.size).toBe(1);
    expect(disposedGeometries.size).toBeGreaterThanOrEqual(4);
    expect(disposedMaterials.size).toBeGreaterThanOrEqual(4);
    expect(sharedMatDisposed).not.toHaveBeenCalled();
  });

  it("KnotViewer disposes cut-face textures and timelines on switch/clear/dispose", () => {
    const texDisposeSpy = vi.spyOn(THREE.Texture.prototype, "dispose");
    const matDisposeSpy = vi.spyOn(THREE.Material.prototype, "dispose");
    const stage = makeFakeStage();

    const viewer = new KnotViewer({} as HTMLCanvasElement, { stage });
    const knot = makeKnot();
    viewer.show(knot, new Player([], knot.duration));
    expect(texDisposeSpy).toHaveBeenCalledTimes(0);
    expect(timelines).toHaveLength(1);

    // Switching knots calls clear(), disposing the first rope's cut-face texture and timeline,
    // while keeping the shared MeshPhysicalMaterial and its map/normalMap alive.
    viewer.show(knot, new Player([], knot.duration));
    expect(texDisposeSpy).toHaveBeenCalledTimes(1);
    expect(timelines[0].dispose).toHaveBeenCalledTimes(1);
    expect(timelines).toHaveLength(2);

    // Disposing the viewer clears the second rope (1 cut-face texture), disposes its timeline,
    // and disposes the shared MeshPhysicalMaterial's map and normalMap (2 textures).
    viewer.dispose();
    expect(timelines[1].dispose).toHaveBeenCalledTimes(1);
    expect(texDisposeSpy).toHaveBeenCalledTimes(4);
    expect(matDisposeSpy).toHaveBeenCalled();
    expect(stage.dispose).toHaveBeenCalledTimes(1);
  });

  it("wires timeline progress to player.setReady and auto-plays once ready >= 0.4", () => {
    const viewer = new KnotViewer({} as HTMLCanvasElement, { stage: makeFakeStage() });
    const knot = makeKnot(4);
    const player = new Player([], knot.duration);

    viewer.show(knot, player, { autoPlay: true });
    const tl = timelines[0] as (typeof timelines)[0] & { emitProgress(r: number): void };

    tl.emitProgress(0.2);
    expect(player.getSnapshot().ready).toBe(0.2);
    expect(player.getSnapshot().playing).toBe(false);

    tl.emitProgress(0.4);
    expect(player.getSnapshot().ready).toBe(0.4);
    expect(player.getSnapshot().playing).toBe(true);

    viewer.dispose();
  });

  it("does not auto-play when autoPlay is false and unsubscribes on clear()", () => {
    const viewer = new KnotViewer({} as HTMLCanvasElement, { stage: makeFakeStage() });
    const knot = makeKnot(4);
    const player = new Player([], knot.duration);

    viewer.show(knot, player, { autoPlay: true });
    const tl = timelines[0] as (typeof timelines)[0] & { emitProgress(r: number): void };

    viewer.clear();
    expect(tl.dispose).toHaveBeenCalledTimes(1);

    // Progress after clear() should not start playback
    tl.emitProgress(2.5);
    expect(player.getSnapshot().playing).toBe(false);

    // autoPlay: false never starts playback
    const player2 = new Player([], knot.duration);
    viewer.show(knot, player2, { autoPlay: false });
    const tl2 = timelines[1] as (typeof timelines)[0] & { emitProgress(r: number): void };
    tl2.emitProgress(3.0);
    expect(player2.getSnapshot().playing).toBe(false);

    viewer.dispose();
  });
});
