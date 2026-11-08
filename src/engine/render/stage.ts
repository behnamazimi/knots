import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Prop } from "../knots/types";

const BACKGROUND = "#ece7de";
const RESET_TIME = 400; // ms for the camera to ease back to the default view
/** Where the key light sits; the rope shades its contact darkening by it too. */
export const KEY_LIGHT = new THREE.Vector3(-0.6, 1.6, 0.9);

/** A fixed prop, drawn from the same axis and radius the simulation collides with. */
export function createPropMesh({ kind, a, b, radius }: Prop): THREE.Mesh {
  const axis = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
  const length = axis.length();
  const mesh = new THREE.Mesh(
    kind === "capsule"
      ? new THREE.CapsuleGeometry(radius, length, 8, 24)
      : new THREE.CylinderGeometry(radius, radius, length, 32),
    new THREE.MeshStandardMaterial({ color: "#8a7458", roughness: 0.7 }),
  );
  mesh.position.set(...a).addScaledVector(axis, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Renderer, camera and a softly lit table for the rope to lie on. */
export function createStage(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  scene.fog = new THREE.Fog(BACKGROUND, 2.2, 4.5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const key = new THREE.DirectionalLight("#fff4e8", 2.6);
  key.position.copy(KEY_LIGHT);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 5;
  key.shadow.intensity = 0.65; // the fill and room light reach into the shade; full-strength shadows read too heavy
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.002;
  Object.assign(key.shadow.camera, {
    left: -0.8,
    right: 0.8,
    top: 0.8,
    bottom: -0.8,
    near: 0.5,
    far: 3.5,
  });
  scene.add(key);
  // Weak warm fill from below and around, so shadows read soft brown, never black or grey.
  scene.add(new THREE.HemisphereLight("#fff4e6", "#a8875c", 0.35));

  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshStandardMaterial({ color: "#e4ddd1", roughness: 0.95 }),
  );
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
  camera.position.set(0.02, 1.15, 0.69); // about 60° above the table
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0.02, 0.02, 0.04);
  controls.enableDamping = true;
  controls.minDistance = 0.25;
  controls.maxDistance = 2.5;
  controls.maxPolarAngle = Math.PI * 0.47; // stay above the table
  controls.update();
  controls.saveState(); // the default view that resetView returns to

  const viewListeners = new Set<() => void>();
  const notifyView = () => viewListeners.forEach((l) => l());
  controls.addEventListener("change", notifyView);
  // The pointer handlers move the camera through update() themselves, so the loop's own
  // update() can return false after a drag step; the change event catches those.
  let viewMoved = false;
  controls.addEventListener("change", () => (viewMoved = true));
  const isDefaultView = () =>
    camera.position.distanceTo(controls.position0) < 1e-3 &&
    controls.target.distanceTo(controls.target0) < 1e-3;

  // A reset eases from where the view is to the default over RESET_TIME.
  let reset: { from: THREE.Vector3; target: THREE.Vector3; start: number } | null = null;
  const stepReset = (now: number) => {
    if (!reset) return false;
    const u = Math.min((now - reset.start) / RESET_TIME, 1);
    const e = u * u * (3 - 2 * u);
    camera.position.lerpVectors(reset.from, controls.position0, e);
    controls.target.lerpVectors(reset.target, controls.target0, e);
    if (u === 1) {
      reset = null;
      controls.reset(); // lands exactly and drops any leftover drag momentum
    }
    notifyView();
    return true;
  };

  // Resizing clears the canvas, so the next frame has to draw.
  let resized = true;
  const resize = () => {
    resized = true;
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the whole rope in view on narrow screens.
    camera.fov = w / h < 1 ? 30 / Math.max(0.55, w / h) : 30;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  // A restored context starts blank; a paused knot would otherwise stay that way.
  const restored = () => (resized = true);
  canvas.addEventListener("webglcontextrestored", restored);

  return {
    renderer,
    scene,
    camera,
    controls,
    /**
     * Draws a frame if the scene changed or the view moved, eased or resized; returns whether it drew.
     * Leave `sceneChanged` out to draw every frame.
     */
    render(now: number, sceneChanged = true) {
      const easing = stepReset(now);
      const moved = controls.update(); // also carries damping drift after a drag
      if (!sceneChanged && !easing && !moved && !viewMoved && !resized) return false;
      viewMoved = resized = false;
      renderer.render(scene, camera);
      return true;
    },
    /** Eases the camera back to the default view; jumps when motion is reduced. */
    resetView(now: number, instant = false) {
      // Spend any drag momentum now: with damping on, it would carry the camera off the default
      // after the reset lands (an update without damping applies and clears it).
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = true;
      if (instant) {
        reset = null;
        controls.reset();
      } else reset = { from: camera.position.clone(), target: controls.target.clone(), start: now };
    },
    isDefaultView,
    /** Calls `listener` whenever the camera moves; returns an unsubscribe. */
    onViewChange(listener: () => void) {
      viewListeners.add(listener);
      return () => viewListeners.delete(listener);
    },
    dispose() {
      observer.disconnect();
      canvas.removeEventListener("webglcontextrestored", restored);
      controls.dispose();
      table.geometry.dispose();
      table.material.dispose();
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

export type Stage = ReturnType<typeof createStage>;
