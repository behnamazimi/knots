import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { RopeMesh } from "./ropeMesh";

function makeTestRopeData(n: number): { p: Float32Array; pn: Float32Array } {
  const p = new Float32Array(n * 3);
  const pn = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * Math.PI * 1.5;
    p[i * 3] = Math.cos(t) * 0.06;
    p[i * 3 + 1] = 0.02 + Math.sin(t * 2) * 0.015;
    p[i * 3 + 2] = Math.sin(t) * 0.06;
    pn[i * 3] = Math.cos(t);
    pn[i * 3 + 1] = 0;
    pn[i * 3 + 2] = Math.sin(t);
  }
  return { p, pn };
}

function hashFloat32(arr: ArrayLike<number>): number {
  const view = new DataView(new ArrayBuffer(4));
  let h = 0x811c9dc5;
  for (let i = 0; i < arr.length; i++) {
    view.setFloat32(0, arr[i], true);
    h ^= view.getUint32(0, true);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

describe("RopeMesh", () => {
  it("populates static UVs in constructor and does not re-upload UVs in update()", () => {
    const mat = new THREE.MeshPhysicalMaterial();
    const mesh = new RopeMesh(12, { length: 0.4, radius: 0.01 }, mat);
    const uvs = mesh.geometry.attributes.uv as THREE.BufferAttribute;

    // UVs should already be populated before update() is called.
    const uvArray = uvs.array as Float32Array;
    const hasNonZeroUv = uvArray.some((v) => v !== 0);
    expect(hasNonZeroUv).toBe(true);

    const versionBefore = uvs.version;
    const { p, pn } = makeTestRopeData(12);
    mesh.update(p, pn);

    // update() must not mark uvs.needsUpdate = true (which increments version).
    expect(uvs.version).toBe(versionBefore);
    mesh.dispose();
    mat.dispose();
  });

  it("produces valid, deterministic positions, normals, colors, and UVs in update()", () => {
    const mat = new THREE.MeshPhysicalMaterial();
    const mesh = new RopeMesh(12, { length: 0.4, radius: 0.01 }, mat);
    const { p, pn } = makeTestRopeData(12);
    mesh.update(p, pn);

    const pos = mesh.geometry.attributes.position.array as Float32Array;
    const nrm = mesh.geometry.attributes.normal.array as Float32Array;
    const col = mesh.geometry.attributes.color.array as Float32Array;
    const uv = mesh.geometry.attributes.uv.array as Float32Array;

    // Sanity invariants on geometry attributes.
    for (let i = 0; i < pos.length; i++) expect(Number.isFinite(pos[i])).toBe(true);
    for (let i = 0; i < nrm.length; i += 3) {
      const len = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]);
      expect(len).toBeCloseTo(1, 4);
    }
    for (let i = 0; i < col.length; i++) {
      expect(col[i]).toBeGreaterThanOrEqual(0);
      expect(col[i]).toBeLessThanOrEqual(1);
    }

    // Exact bit-level fingerprints from baseline RopeMesh ensure optimization leaves output unchanged.
    expect({
      pos: hashFloat32(pos),
      nrm: hashFloat32(nrm),
      col: hashFloat32(col),
      uv: hashFloat32(uv),
    }).toEqual({
      pos: 4202572538,
      nrm: 697434758,
      col: 1781064584,
      uv: 1987592694,
    });

    mesh.dispose();
    mat.dispose();
  });
});
