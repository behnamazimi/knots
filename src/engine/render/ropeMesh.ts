import * as THREE from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { createCutFaceTexture } from "./ropeMaterial";
import { KEY_LIGHT } from "./stage";

const STRANDS = 3;
const RADIAL = 20; // vertices around each strand
const SUB = 3; // smooth samples per particle gap
const CAP = 4; // rings in each strand's rounded end
// Strand crests reach a little past the collision radius: where rope presses on rope in a knot,
// the strands meet and nest into each other's grooves instead of leaving a visible gap.
const VISUAL_SCALE = 1.08;
const OFFSET = 0.55; // strand axis distance from the rope axis, in visual radii
// Strands are squashed against each other, so they are wider around the rope than they are deep.
// Half-widths overlap neighbours a little (2 · 0.5 > √3 · 0.55), leaving a tight crease, not a gap.
const STRAND_DEPTH = 0.45; // radial half-depth, in visual radii: crest at 0.55 + 0.45 = 1
const STRAND_WIDTH = 0.5; // half-width around the rope, in visual radii
const LAY = 7; // rope length per full turn of the strands, in radii
const HAIRS_PER_RADIUS = 72; // loose fibres per radius of rope length, per strand
const HAIR_LENGTH = 0.13; // typical loose fibre, in radii; real lengths scatter widely around it
const STRAYS = 0.05; // share of fibres that are long strays
// Each end is cut clean: the three strands show past a crimped metal sleeve that holds them.
const TIP = 0.06; // cut strands showing beyond the sleeve, in radii: barely past its lip
const HAIR_WIDTH = 0.00035; // m: real fibre width, so hairs thin out as the camera pulls back
const SLEEVE = 1.2; // sleeve length, in radii
// The sleeve is crimped on: rope under it is squeezed to SQUEEZE, and its lips bite in further.
const SQUEEZE = 0.9;
const WALL = 0.09; // sleeve wall thickness, in visual radii
const TUFTS = 300; // fibres standing out of each strand's cut end, spread over the whole face
const NEAR = 12; // closest other rope parts remembered per particle, for contact shading
// Groove colour: about half as bright as the crest and greyer, the strongest cue of twisted rope.
const GROOVE = [0.5, 0.49, 0.5];
const DIRT = [0.78, 0.76, 0.76]; // greyer, darker wear where rope presses on rope in the knot
const CONTACT_SHADOW = 0x4a3524; // warm brown, so the shadow under the rope is not grey
const TO_LIGHT = KEY_LIGHT.clone().normalize();

/**
 * Three-strand laid rope built around the simulated centerline every frame.
 * The strands are real geometry, so the outline is bumpy and the grooves stay dark.
 */
export class RopeMesh extends THREE.Mesh<THREE.BufferGeometry, THREE.Material> {
  private readonly n: number;
  private readonly m: number;
  private readonly rings: number;
  private readonly d: number;
  private readonly rs: number;
  private readonly rw: number;
  private readonly pitch: number;
  private readonly centers: Float32Array;
  private readonly frames: Float32Array; // normal and binormal per sample
  private readonly tangents: Float32Array;
  private readonly lengths: Float32Array;
  private readonly axis: Float32Array; // one strand's axis per sample
  private readonly outward: Float32Array; // from the rope axis toward that strand
  /** Loose fibres: each sticks out of one strand vertex, bent a little along the rope. */
  private readonly hairs: LineSegments2;
  private readonly hairRoot: Uint32Array; // strand vertex each fibre grows from
  private readonly hairShape: Float32Array; // length, lean along the rope, curl, sideways, per fibre
  private readonly bodyHairs: number; // fibres from here on grow out of the cut faces
  private readonly tuftAt: Float32Array; // per cut-face fibre: which disc, angle around it, distance out
  private readonly ds: number; // centreline length between samples
  private readonly sleeves: THREE.Mesh[];
  /** Cut end of each strand at both rope ends, showing the yarns packed inside it. */
  private readonly cutFaces: THREE.Mesh;
  private readonly radius: number;
  private readonly near: Int16Array; // per particle, up to NEAR particles of other rope close by
  private readonly nearCount: Uint8Array;
  private readonly nearDist: Float32Array;
  private readonly contact: Float32Array; // per particle: 0 free, 1 pressed into the knot
  /** Soft shadow on the table right under the rope, darker the closer the rope lies. */
  private readonly ground: THREE.Mesh;

  constructor(n: number, rope: { length: number; radius: number }, material: THREE.Material) {
    const { radius } = rope;
    const m = (n - 1) * SUB + 1;
    const rings = m + 2 * CAP;
    const verts = STRANDS * rings * (RADIAL + 1);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(verts * 2), 2));
    const index: number[] = [];
    for (let s = 0; s < STRANDS; s++)
      for (let r = 0; r < rings - 1; r++)
        for (let j = 0; j < RADIAL; j++) {
          const a = (s * rings + r) * (RADIAL + 1) + j;
          const b = a + RADIAL + 1;
          index.push(a, a + 1, b, b, a + 1, b + 1); // counter-clockwise seen from outside
        }
    geometry.setIndex(index);
    super(geometry, material);
    const visual = radius * VISUAL_SCALE;
    this.n = n;
    this.m = m;
    this.rings = rings;
    this.d = OFFSET * visual;
    this.rs = STRAND_DEPTH * visual;
    this.rw = STRAND_WIDTH * visual;
    this.pitch = LAY * radius;
    this.centers = new Float32Array(m * 3);
    this.frames = new Float32Array(m * 6);
    this.tangents = new Float32Array(m * 3);
    // The lay is measured along the rope at rest, so stretching never slides the strands.
    this.lengths = Float32Array.from({ length: m }, (_, k) => (k / SUB) * (rope.length / (n - 1)));
    this.axis = new Float32Array(m * 3);
    this.outward = new Float32Array(m * 3);
    this.castShadow = true;
    this.receiveShadow = true;
    this.frustumCulled = false;

    // Fibres grow only on the outer half of each strand, where the rope rubs and frays.
    const body = Math.round((rope.length / radius) * HAIRS_PER_RADIUS * STRANDS);
    const count = body + 2 * STRANDS * TUFTS;
    this.ds = rope.length / (n - 1) / SUB;
    // No fibres under the sleeves or on the sealed tips.
    const endZone = Math.ceil(((TIP + SLEEVE) * radius) / this.ds);
    this.hairRoot = new Uint32Array(count);
    this.hairShape = new Float32Array(count * 5);
    let seed = 11;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
    // Fuzz comes in patches where the rope has rubbed: a slow random density along the rope.
    const patches = Array.from({ length: 24 }, () => rand());
    const density = (r: number) => {
      const x = ((r - CAP) / m) * (patches.length - 1);
      const i = Math.min(Math.floor(x), patches.length - 2);
      return patches[i] + (patches[i + 1] - patches[i]) * (x - i);
    };
    for (let h = 0; h < body; h++) {
      const s = Math.floor(rand() * STRANDS);
      let r = CAP + endZone + Math.floor(rand() * (m - 2 * endZone));
      while (rand() > 0.25 + 0.75 * density(r))
        r = CAP + endZone + Math.floor(rand() * (m - 2 * endZone));
      const j = Math.round((rand() - 0.5) * 0.5 * RADIAL + RADIAL) % RADIAL; // ±quarter turn of the crest
      this.hairRoot[h] = (s * rings + r) * (RADIAL + 1) + j;
      // Mostly short, a long tail of medium ones, and a few long strays.
      const len =
        rand() < STRAYS
          ? HAIR_LENGTH * (3 + 3 * rand())
          : HAIR_LENGTH * Math.min(3, Math.exp(0.5 * gauss()));
      // Length, lean along the rope, curl, sideways, and how much it stands up from the surface:
      // some stick straight out, many lie over or bend away.
      this.hairShape.set(
        [len * radius, gauss() * 0.6, gauss() * 0.5, gauss() * 0.9, 0.1 + 0.9 * rand() ** 0.7],
        h * 5,
      );
    }
    // Tufts at the cut ends: short fibres standing out of each strand's face, splaying a little.
    // Roots are spread evenly over the whole face (√ of a uniform number gives uniform area).
    this.bodyHairs = body;
    this.tuftAt = new Float32Array((count - body) * 3);
    for (let h = body; h < count; h++) {
      const e = h - body;
      this.tuftAt.set([Math.floor(e / TUFTS), rand() * RADIAL, Math.sqrt(rand()) * 0.97], e * 3);
      const len = HAIR_LENGTH * (0.5 + rand() * 1.3);
      this.hairShape.set([len * radius, 0, gauss() * 0.3, gauss() * 0.35, 1], h * 5);
    }
    // Wide lines: plain WebGL lines are always 1 px, too fine to read as fibre.
    const hairGeometry = new LineSegmentsGeometry();
    hairGeometry.setPositions(new Float32Array(count * 2 * 6)); // two segments per fibre
    const base: THREE.Color = material.userData.fibreColor ?? new THREE.Color("#c39f6a");
    // Each fibre comes out of the strand's shade: dark at the root, lighter toward the tip.
    const root = base.clone().multiplyScalar(0.45);
    const mid = base.clone().multiplyScalar(0.8);
    const tip = base.clone().lerp(new THREE.Color(0xf3e4c0), 0.2);
    const shades = new Float32Array(count * 12);
    const tint = new THREE.Color();
    for (let h = 0; h < count; h++) {
      // Each fibre is its own shade, from dark brown to pale straw.
      const v = 0.75 + 0.45 * rand();
      const a = tint.copy(root).multiplyScalar(v).toArray();
      const b = tint.copy(mid).multiplyScalar(v).toArray();
      const c = tint.copy(tip).multiplyScalar(v).toArray();
      shades.set([...a, ...b, ...b, ...c], h * 12);
    }
    hairGeometry.setColors(shades);
    const hairMaterial = new LineMaterial({
      vertexColors: true,
      linewidth: HAIR_WIDTH,
      worldUnits: true,
      transparent: true,
      opacity: 0.9,
    });
    this.hairs = new LineSegments2(hairGeometry, hairMaterial);
    const size = new THREE.Vector2();
    this.hairs.onBeforeRender = (renderer) => hairMaterial.resolution.copy(renderer.getSize(size));
    this.hairs.frustumCulled = false;
    this.add(this.hairs);

    this.radius = radius;
    this.near = new Int16Array(n * NEAR);
    this.nearCount = new Uint8Array(n);
    this.nearDist = new Float32Array(n * NEAR);
    this.contact = new Float32Array(n);

    // Ground strip: edge, middle, edge per sample; colour alpha fades across and with height.
    const groundGeometry = new THREE.BufferGeometry();
    groundGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(m * 9), 3));
    groundGeometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(m * 12), 4));
    const strip: number[] = [];
    for (let k = 0; k < m - 1; k++)
      for (let c = 0; c < 2; c++) {
        const a = k * 3 + c;
        strip.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
      }
    groundGeometry.setIndex(strip);
    this.ground = new THREE.Mesh(
      groundGeometry,
      new THREE.MeshBasicMaterial({
        color: CONTACT_SHADOW,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
    this.ground.frustumCulled = false;
    this.ground.renderOrder = -1;
    this.add(this.ground);

    // Sleeve profile, turned around the rope: rounded lips and two crimp grooves.
    // Built outward from the squeezed rope, so no strand ever cuts into the wall or the lips.
    const Ri = SQUEEZE * visual * 1.01; // inner wall, sitting on the squeezed strand crests
    const R = Ri + WALL * visual;
    const lip = Ri + 0.4 * WALL * visual; // rolled lip, still clear of the rope
    const L = SLEEVE * radius;
    // A closed outline, so the sleeve is a solid tube with a wall, not a see-through shell:
    // outer face with crimp grooves, rolled lip, then back along the inside against the rope.
    const profile = [
      [Ri, -L / 2],
      [lip, -L / 2],
      [R, -L / 2 + 0.06 * L],
      [R, -0.22 * L],
      [R - 0.35 * WALL * visual, -0.17 * L],
      [R, -0.12 * L],
      [R, 0.12 * L],
      [R - 0.35 * WALL * visual, 0.17 * L],
      [R, 0.22 * L],
      [R, L / 2 - 0.06 * L],
      [lip, L / 2],
      [Ri, L / 2],
      [Ri, -L / 2],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const sleeveGeometry = new THREE.LatheGeometry(profile, 40);
    const metal = new THREE.MeshStandardMaterial({
      color: 0x8a8d91,
      metalness: 1,
      roughness: 0.5,
      side: THREE.DoubleSide, // the closed outline's winding flips on the inner wall
    });
    this.sleeves = [0, 1].map(() => {
      const sleeve = new THREE.Mesh(sleeveGeometry, metal);
      sleeve.castShadow = true;
      sleeve.receiveShadow = true;
      this.add(sleeve);
      return sleeve;
    });

    // One disc per strand per end: a centre vertex fanned to the strand's last ring.
    const discs = 2 * STRANDS;
    const perDisc = RADIAL + 2;
    const faceGeometry = new THREE.BufferGeometry();
    faceGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(discs * perDisc * 3), 3),
    );
    faceGeometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(new Float32Array(discs * perDisc * 3), 3),
    );
    const faceUv = new Float32Array(discs * perDisc * 2);
    const fan: number[] = [];
    for (let d = 0; d < discs; d++) {
      const o = d * perDisc;
      faceUv.set([0.5, 0.5], o * 2);
      const turn = d * 2.1; // each strand shows its yarns at a different angle
      for (let j = 0; j <= RADIAL; j++) {
        const a = (j / RADIAL) * Math.PI * 2 + turn;
        faceUv.set([0.5 + 0.48 * Math.cos(a), 0.5 + 0.48 * Math.sin(a)], (o + 1 + j) * 2);
        if (j < RADIAL) fan.push(o, o + 1 + j, o + 2 + j);
      }
    }
    faceGeometry.setAttribute("uv", new THREE.BufferAttribute(faceUv, 2));
    faceGeometry.setIndex(fan);
    this.cutFaces = new THREE.Mesh(
      faceGeometry,
      new THREE.MeshStandardMaterial({
        map: createCutFaceTexture(base),
        roughness: 0.95,
        side: THREE.DoubleSide,
      }),
    );
    this.cutFaces.frustumCulled = false;
    this.add(this.cutFaces);
  }

  update(p: Float32Array, pn: Float32Array): void {
    const { n, m, centers, frames, tangents, lengths, axis, outward, d, rs, rw, pitch } = this;
    // Catmull-Rom between particles for a smooth centerline.
    for (let i = 0; i < n - 1; i++)
      for (let s = 0; s < SUB; s++) {
        const u = s / SUB;
        const o = (i * SUB + s) * 3;
        for (let c = 0; c < 3; c++) {
          const p0 = p[Math.max(i - 1, 0) * 3 + c];
          const p1 = p[i * 3 + c];
          const p2 = p[(i + 1) * 3 + c];
          const p3 = p[Math.min(i + 2, n - 1) * 3 + c];
          centers[o + c] =
            0.5 *
            (2 * p1 +
              (p2 - p0) * u +
              (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
              (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
        }
      }
    centers.set(p.subarray((n - 1) * 3, n * 3), (m - 1) * 3);
    this.findContacts(p);

    // Frames from the baked material normals, so the twist travels with the rope.
    const t = new THREE.Vector3();
    const nor = new THREE.Vector3();
    const bin = new THREE.Vector3();
    for (let k = 0; k < m; k++) {
      const a = Math.max(k - 1, 0) * 3;
      const b = Math.min(k + 1, m - 1) * 3;
      t.set(
        centers[b] - centers[a],
        centers[b + 1] - centers[a + 1],
        centers[b + 2] - centers[a + 2],
      ).normalize();
      const i = Math.min(Math.floor(k / SUB), n - 2);
      const u = k / SUB - i;
      nor.set(
        pn[i * 3] * (1 - u) + pn[i * 3 + 3] * u,
        pn[i * 3 + 1] * (1 - u) + pn[i * 3 + 4] * u,
        pn[i * 3 + 2] * (1 - u) + pn[i * 3 + 5] * u,
      );
      nor.addScaledVector(t, -nor.dot(t)).normalize();
      bin.crossVectors(t, nor);
      t.toArray(tangents, k * 3);
      nor.toArray(frames, k * 6);
      bin.toArray(frames, k * 6 + 3);
    }

    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    const normals = this.geometry.attributes.normal as THREE.BufferAttribute;
    const colors = this.geometry.attributes.color as THREE.BufferAttribute;
    const uvs = this.geometry.attributes.uv as THREE.BufferAttribute;
    const center = new THREE.Vector3();
    const out = new THREE.Vector3();
    const st = new THREE.Vector3();
    const sn = new THREE.Vector3();
    const sb = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const col = [0, 0, 0];

    for (let s = 0; s < STRANDS; s++) {
      const phase = (2 * Math.PI * s) / STRANDS;
      for (let k = 0; k < m; k++) {
        const angle = (2 * Math.PI * lengths[k]) / pitch + phase;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const shape = this.endShape(k);
        for (let c = 0; c < 3; c++) {
          const o = cos * frames[k * 6 + c] + sin * frames[k * 6 + 3 + c];
          outward[k * 3 + c] = o;
          axis[k * 3 + c] = centers[k * 3 + c] + o * d * shape;
        }
      }

      // Rings run: start cap (tip first), body, end cap.
      for (let r = 0; r < this.rings; r++) {
        const k = r - CAP;
        const kk = Math.min(Math.max(k, 0), m - 1);
        const a = Math.max(kk - 1, 0) * 3;
        const b = Math.min(kk + 1, m - 1) * 3;
        st.set(axis[b] - axis[a], axis[b + 1] - axis[a + 1], axis[b + 2] - axis[a + 2]).normalize();
        out.fromArray(outward, kk * 3);
        // The ring frame faces away from the rope axis, so the dark inner side stays inside.
        sn.copy(out).addScaledVector(st, -out.dot(st)).normalize();
        sb.crossVectors(st, sn);
        center.fromArray(axis, kk * 3);

        let ringR = this.endShape(kk);
        let tilt = 0;
        let along = lengths[kk];
        if (k < 0 || k >= m) {
          // Cut flat: the cap rings close the strand into a disc facing out of the rope.
          const sign = k < 0 ? -1 : 1;
          ringR *= 1 - (k < 0 ? -k : k - m + 1) / CAP;
          tilt = (sign * Math.PI) / 2;
        }

        for (let j = 0; j <= RADIAL; j++) {
          const ang = (j / RADIAL) * Math.PI * 2;
          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);
          const v = (s * this.rings + r) * (RADIAL + 1) + j;
          pos.setXYZ(
            v,
            center.x + (sn.x * cosA * rs + sb.x * sinA * rw) * ringR,
            center.y + (sn.y * cosA * rs + sb.y * sinA * rw) * ringR,
            center.z + (sn.z * cosA * rs + sb.z * sinA * rw) * ringR,
          );
          // Normal of an ellipse: the flatter the side, the more it faces outward.
          dir
            .copy(sn)
            .multiplyScalar(cosA / rs)
            .addScaledVector(sb, sinA / rw)
            .normalize();
          // Occlusion: the sides pressed against the other strands sit in a dark, grey groove,
          // and so does whatever faces other rope in the knot.
          const lit = Math.min(1, Math.max(0, 0.45 + 0.75 * dir.dot(out)));
          const x = center.x + (sn.x * cosA * rs + sb.x * sinA * rw) * ringR;
          const y = center.y + (sn.y * cosA * rs + sb.y * sinA * rw) * ringR;
          const z = center.z + (sn.z * cosA * rs + sb.z * sinA * rw) * ringR;
          const pi = Math.min(Math.round(kk / SUB), n - 1);
          // Blend the particles either side, so shade does not step where the nearest one changes.
          const pa = Math.min(Math.floor(kk / SUB), n - 1);
          const pb = Math.min(pa + 1, n - 1);
          const f = kk / SUB - pa;
          const occ =
            (1 - f) * this.occlusion(p, pa, x, y, z, dir) + f * this.occlusion(p, pb, x, y, z, dir);
          // Sides facing the key light keep most of their light: the shadow map darkens them if blocked.
          const open = 1 - 0.65 * occ * (1 - 0.7 * Math.max(0, dir.dot(TO_LIGHT)));
          const worn = this.contact[pi] * 0.7;
          if (tilt !== 0) {
            // Cut face: packed fibre ends, lit straight on, mottled bundle to bundle. Groove and
            // contact shading belong to the strand's sides; here they made the face read as a hole.
            const c = 0.82 + 0.18 * Math.abs((Math.sin(v * 12.9898) * 43758.5453) % 1);
            col[0] = col[1] = col[2] = c;
          } else
            for (let c = 0; c < 3; c++)
              col[c] = (GROOVE[c] + (1 - GROOVE[c]) * lit) * open * (1 - worn + worn * DIRT[c]);
          colors.setXYZ(v, col[0], col[1], col[2]);
          if (tilt !== 0) dir.multiplyScalar(Math.cos(tilt)).addScaledVector(st, Math.sin(tilt));
          normals.setXYZ(v, dir.x, dir.y, dir.z);
          // The cut face takes one spot of the texture: wrapping it around would pinwheel to a point.
          if (tilt !== 0) uvs.setXY(v, along / pitch, 0.5);
          else uvs.setXY(v, along / pitch, j / RADIAL);
        }
      }
    }
    pos.needsUpdate = true;
    normals.needsUpdate = true;
    colors.needsUpdate = true;
    uvs.needsUpdate = true;
    this.updateGround();
    this.updateSleeves();
    this.updateCutFaces();
    this.updateHairs(); // after the cut faces: end tufts grow out of them
  }

  /** Sits each sleeve just behind its charred tip, lined up with the rope there. */
  /** Lays each strand's cut face over its last ring, a hair proud so it never flickers. */
  private updateCutFaces(): void {
    const { m, rings, tangents, radius } = this;
    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    const out = this.cutFaces.geometry.attributes.position as THREE.BufferAttribute;
    const nrm = this.cutFaces.geometry.attributes.normal as THREE.BufferAttribute;
    const perDisc = RADIAL + 2;
    const proud = 0.02 * radius;
    for (let end = 0; end < 2; end++) {
      const r = end === 0 ? CAP : CAP + m - 1;
      const t = end === 0 ? 0 : (m - 1) * 3;
      const sign = end === 0 ? -1 : 1; // the face looks out of the rope
      const nx = sign * tangents[t];
      const ny = sign * tangents[t + 1];
      const nz = sign * tangents[t + 2];
      for (let s = 0; s < STRANDS; s++) {
        const o = (end * STRANDS + s) * perDisc;
        const ring = (s * rings + r) * (RADIAL + 1);
        let cx = 0;
        let cy = 0;
        let cz = 0;
        for (let j = 0; j <= RADIAL; j++) {
          const x = pos.getX(ring + j) + nx * proud;
          const y = pos.getY(ring + j) + ny * proud;
          const z = pos.getZ(ring + j) + nz * proud;
          out.setXYZ(o + 1 + j, x, y, z);
          nrm.setXYZ(o + 1 + j, nx, ny, nz);
          if (j < RADIAL) {
            cx += x / RADIAL;
            cy += y / RADIAL;
            cz += z / RADIAL;
          }
        }
        out.setXYZ(o, cx, cy, cz);
        nrm.setXYZ(o, nx, ny, nz);
      }
    }
    out.needsUpdate = true;
    nrm.needsUpdate = true;
  }

  private updateSleeves(): void {
    const { m, centers, tangents, ds, radius } = this;
    // Exact arc position, between samples, so the tip showing past the lip is as short as set.
    const f = Math.min(((TIP + SLEEVE / 2) * radius) / ds, m - 2);
    const up = new THREE.Vector3(0, 1, 0);
    const t = new THREE.Vector3();
    const a = new THREE.Vector3();
    for (const [sleeve, kf] of [
      [this.sleeves[0], f],
      [this.sleeves[1], m - 1 - f],
    ] as const) {
      const k = Math.floor(kf);
      const u = kf - k;
      sleeve.position.fromArray(centers, k * 3).lerp(a.fromArray(centers, (k + 1) * 3), u);
      t.fromArray(tangents, k * 3)
        .lerp(a.fromArray(tangents, (k + 1) * 3), u)
        .normalize();
      sleeve.quaternion.setFromUnitVectors(up, t);
    }
  }

  /**
   * How far the strands sit from the rope axis, and how big they are, near the ends: squeezed
   * under the sleeve.
   */
  private endShape(k: number): number {
    const r = this.radius;
    const s = Math.min(k, this.m - 1 - k) * this.ds; // from the nearer cut end
    // 1 inside the sleeve, easing to 0 a little past each lip.
    // Squeezed from the cut tip through the sleeve, easing back to full size past its inner lip.
    const start = (TIP + SLEEVE) * r;
    const end = (TIP + SLEEVE + 0.4) * r;
    const ease = Math.min(1, Math.max(0, (s - start) / (end - start)));
    return 1 - (1 - SQUEEZE) * (1 - ease);
  }

  /** For each particle, the nearby particles of other rope, and how pressed into the knot it is. */
  private findContacts(p: Float32Array): void {
    const { n, nearCount, contact, radius } = this;
    const reach = 3.2 * radius;
    const reach2 = reach * reach;
    const skip = 4; // neighbours along the rope always touch; they are not contact
    nearCount.fill(0);
    contact.fill(0);
    for (let i = 0; i < n; i++)
      for (let j = i + skip; j < n; j++) {
        const dx = p[i * 3] - p[j * 3];
        const dy = p[i * 3 + 1] - p[j * 3 + 1];
        const dz = p[i * 3 + 2] - p[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > reach2) continue;
        const d = Math.sqrt(d2);
        const press = Math.min(1, (reach - d) / (reach - 2 * radius));
        contact[i] = Math.min(1, contact[i] + 0.5 * press);
        contact[j] = Math.min(1, contact[j] + 0.5 * press);
        this.remember(i, j, d);
        this.remember(j, i, d);
      }
    // Spread along the rope so wear fades in and out instead of switching per particle.
    for (let pass = 0; pass < 2; pass++)
      for (let i = 1; i < n - 1; i++)
        contact[i] = Math.max(contact[i], (contact[i - 1] + contact[i + 1]) * 0.4);
  }

  /** Keeps j among i's NEAR closest parts of other rope, dropping the farthest when full. */
  private remember(i: number, j: number, d: number): void {
    const { near, nearCount, nearDist } = this;
    const o = i * NEAR;
    let slot = nearCount[i];
    if (slot < NEAR) nearCount[i]++;
    else {
      slot = 0;
      for (let q = 1; q < NEAR; q++) if (nearDist[o + q] > nearDist[o + slot]) slot = q;
      if (nearDist[o + slot] <= d) return;
    }
    near[o + slot] = j;
    nearDist[o + slot] = d;
  }

  /** How much of a surface point's view is blocked by nearby rope it faces (0 open, 1 buried). */
  private occlusion(
    p: Float32Array,
    i: number,
    x: number,
    y: number,
    z: number,
    nrm: THREE.Vector3,
  ): number {
    const { near, nearCount, radius } = this;
    let occ = 0;
    for (let q = 0; q < nearCount[i]; q++) {
      const j = near[i * NEAR + q] * 3;
      const dx = p[j] - x;
      const dy = p[j + 1] - y;
      const dz = p[j + 2] - z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const facing = (dx * nrm.x + dy * nrm.y + dz * nrm.z) / d;
      if (facing <= 0) continue;
      const u = Math.min(1, Math.max(0, (d - radius) / (1.5 * radius)));
      occ += facing * (1 - u * u * (3 - 2 * u)); // smoothstep: no crease where the falloff starts
    }
    // The table occludes the underside too.
    occ += Math.max(0, -nrm.y) * Math.max(0, 1 - (y - 0) / (2 * radius)) * 0.6;
    return 1 - Math.exp(-1.6 * occ); // saturates softly, so packed spots shade in gradually
  }

  private updateGround(): void {
    const { m, centers, tangents, radius } = this;
    const pos = this.ground.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.ground.geometry.attributes.color as THREE.BufferAttribute;
    let px = 0;
    let pz = 0;
    for (let k = 0; k < m; k++) {
      const x = centers[k * 3];
      const z = centers[k * 3 + 2];
      const h = Math.max(0, centers[k * 3 + 1] - radius); // height above lying on the table
      let sx = -tangents[k * 3 + 2];
      let sz = tangents[k * 3];
      const l = Math.hypot(sx, sz) || 1;
      // Keep the strip's sides from swapping between samples, which draws thin fans.
      if (sx * px + sz * pz < 0) {
        sx = -sx;
        sz = -sz;
      }
      px = sx;
      pz = sz;
      // Wider and fainter as the rope lifts off: tight and dark where it nearly touches. Never
      // wider than the bend it follows, or the inner edge folds over into a fan.
      const a = Math.max(k - 2, 0) * 3;
      const b = Math.min(k + 2, m - 1) * 3;
      const ax = tangents[a];
      const az = tangents[a + 2];
      const bx = tangents[b];
      const bz = tangents[b + 2];
      const turn = Math.acos(
        Math.min(1, (ax * bx + az * bz) / (Math.hypot(ax, az) * Math.hypot(bx, bz) || 1)),
      );
      const bend = turn > 1e-4 ? (((b - a) / 3) * this.ds) / turn : Infinity;
      const w = Math.min(radius * Math.min(1.8, 1.2 + h / radius), 0.7 * bend);
      sx = (sx / l) * w;
      sz = (sz / l) * w;
      // Where the rope runs steeply up or down its sideways direction is unreliable: fade out.
      const alpha =
        0.38 * Math.max(0, 1 - h / (2 * radius)) * Math.min(1, Math.max(0, (l - 0.5) * 3));
      const o = k * 3;
      pos.setXYZ(o, x - sx, 0.0005, z - sz);
      pos.setXYZ(o + 1, x, 0.0005, z);
      pos.setXYZ(o + 2, x + sx, 0.0005, z + sz);
      col.setXYZW(o, 1, 1, 1, 0);
      col.setXYZW(o + 1, 1, 1, 1, alpha);
      col.setXYZW(o + 2, 1, 1, 1, 0);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  private updateHairs(): void {
    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    const nrm = this.geometry.attributes.normal as THREE.BufferAttribute;
    const start = this.hairs.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute;
    const out = start.data.array as Float32Array; // per segment: start xyz, end xyz
    const { hairRoot, hairShape, tangents, m, n, contact, bodyHairs, tuftAt } = this;
    const face = this.cutFaces.geometry.attributes.position as THREE.BufferAttribute;
    const faceNrm = this.cutFaces.geometry.attributes.normal as THREE.BufferAttribute;
    const perDisc = RADIAL + 2;
    const ringSize = RADIAL + 1;
    for (let h = 0; h < hairRoot.length; h++) {
      const v = hairRoot[h];
      const tuft = h >= bodyHairs;
      const disc = tuft ? tuftAt[(h - bodyHairs) * 3] : 0;
      const k = tuft
        ? disc < STRANDS
          ? 0
          : m - 1
        : Math.min(Math.max((Math.floor(v / ringSize) % this.rings) - CAP, 0), m - 1);
      const hs = h * 5;
      const base = hairShape[hs];
      const lean = hairShape[hs + 1];
      const curl = hairShape[hs + 2];
      const side = hairShape[hs + 3];
      const rise = hairShape[hs + 4];
      // Rope that rubs in the knot is a little fuzzier.
      const len = base * (0.9 + 0.3 * contact[Math.min(Math.round(k / SUB), n - 1)]);
      let px: number;
      let py: number;
      let pz: number;
      let nx: number;
      let ny: number;
      let nz: number;
      if (tuft) {
        // A point on the cut face: between two rim vertices, part way out from the centre.
        const a = tuftAt[(h - bodyHairs) * 3 + 1];
        const rho = tuftAt[(h - bodyHairs) * 3 + 2];
        const o = disc * perDisc;
        const j = Math.floor(a);
        const f = a - j;
        const rimA = o + 1 + j;
        const rimB = rimA + 1;
        const cx = face.getX(o);
        const cy = face.getY(o);
        const cz = face.getZ(o);
        const rx = face.getX(rimA) * (1 - f) + face.getX(rimB) * f;
        const ry = face.getY(rimA) * (1 - f) + face.getY(rimB) * f;
        const rz = face.getZ(rimA) * (1 - f) + face.getZ(rimB) * f;
        px = cx + (rx - cx) * rho;
        py = cy + (ry - cy) * rho;
        pz = cz + (rz - cz) * rho;
        nx = faceNrm.getX(o);
        ny = faceNrm.getY(o);
        nz = faceNrm.getZ(o);
      } else {
        px = pos.getX(v);
        py = pos.getY(v);
        pz = pos.getZ(v);
        nx = nrm.getX(v);
        ny = nrm.getY(v);
        nz = nrm.getZ(v);
      }
      const tx = tangents[k * 3];
      const ty = tangents[k * 3 + 1];
      const tz = tangents[k * 3 + 2];
      // Sideways: across both the rope and the surface normal, for randomly angled fibres.
      let bx = ny * tz - nz * ty;
      let by = nz * tx - nx * tz;
      let bz = nx * ty - ny * tx;
      if (bx * bx + by * by + bz * bz < 0.04) {
        // On a cut face the normal runs along the rope; splay against the table's up instead.
        const l = Math.hypot(nz, nx) || 1;
        bx = -nz / l;
        by = 0;
        bz = nx / l;
      }
      // Out from the surface and leaning along the rope; the tip bends further over.
      const mx = px + (nx * rise + tx * lean + bx * side) * len * 0.5;
      const my = py + (ny * rise + ty * lean + by * side) * len * 0.5;
      const mz = pz + (nz * rise + tz * lean + bz * side) * len * 0.5;
      const ex =
        mx + (nx * rise * (1 - Math.abs(curl)) + tx * (lean + curl) + bx * side) * len * 0.5;
      const ey =
        my + (ny * rise * (1 - Math.abs(curl)) + ty * (lean + curl) + by * side) * len * 0.5;
      const ez =
        mz + (nz * rise * (1 - Math.abs(curl)) + tz * (lean + curl) + bz * side) * len * 0.5;
      // The root starts just under the surface, so the fibre grows out of the strand.
      const sink = 0.25 * len;
      const o = h * 12;
      out[o] = px - nx * sink;
      out[o + 1] = py - ny * sink;
      out[o + 2] = pz - nz * sink;
      out[o + 3] = mx;
      out[o + 4] = my;
      out[o + 5] = mz;
      out[o + 6] = mx;
      out[o + 7] = my;
      out[o + 8] = mz;
      out[o + 9] = ex;
      out[o + 10] = ey;
      out[o + 11] = ez;
    }
    start.data.needsUpdate = true;
  }
}
