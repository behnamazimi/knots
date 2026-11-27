import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RopeMesh } from "./ropeMesh";
import { createStage } from "./stage";

const setPixelRatioMock = vi.fn();

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: class {
      shadowMap = { enabled: false, type: actual.PCFShadowMap };
      toneMapping = actual.NoToneMapping;
      toneMappingExposure = 1;
      setPixelRatio = setPixelRatioMock;
      setSize = vi.fn();
      render = vi.fn();
      dispose = vi.fn();
    },
    PMREMGenerator: class {
      fromScene() {
        return { texture: new actual.Texture() };
      }
      dispose = vi.fn();
    },
  };
});

vi.mock("three/addons/controls/OrbitControls.js", () => ({
  OrbitControls: class {
    target = new THREE.Vector3();
    position0 = new THREE.Vector3();
    target0 = new THREE.Vector3();
    enableDamping = false;
    minDistance = 0;
    maxDistance = 0;
    maxPolarAngle = 0;
    addEventListener = vi.fn();
    update = vi.fn(() => false);
    saveState = vi.fn();
    reset = vi.fn();
    dispose = vi.fn();
  },
}));

describe("Battery Saver quality preference", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { devicePixelRatio: 2 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("RopeMesh uses lower mesh density when lowDensity is true vs false", () => {
    const material = new THREE.MeshPhysicalMaterial();

    const highMesh = new RopeMesh(10, { length: 1, radius: 0.02 }, material, { lowDensity: false });
    const batteryMesh = new RopeMesh(10, { length: 1, radius: 0.02 }, material, {
      lowDensity: true,
    });

    expect(batteryMesh.geometry.attributes.position.count).toBeLessThan(
      highMesh.geometry.attributes.position.count,
    );

    highMesh.dispose();
    batteryMesh.dispose();
    material.dispose();
  });

  it("createStage caps pixelRatio to 1 and disables shadowMap when batterySaver is true", () => {
    setPixelRatioMock.mockClear();
    vi.stubGlobal("window", { devicePixelRatio: 2 });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    const canvas = {
      clientWidth: 800,
      clientHeight: 600,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLCanvasElement;

    const highStage = createStage(canvas, { batterySaver: false });
    expect(setPixelRatioMock).toHaveBeenLastCalledWith(2);
    expect(highStage.renderer.shadowMap.enabled).toBe(true);
    highStage.dispose();

    const batteryStage = createStage(canvas, { batterySaver: true });
    expect(setPixelRatioMock).toHaveBeenLastCalledWith(1);
    expect(batteryStage.renderer.shadowMap.enabled).toBe(false);
    batteryStage.dispose();
  });
});
