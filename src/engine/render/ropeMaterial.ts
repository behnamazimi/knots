import * as THREE from "three";

const SIZE = 512;
// One tile covers one lay length along the rope (u) and once around a strand (v). Yarns twist
// against the strand, so their fibres run along it on a shallow slant: YARNS around, ACROSS
// along one lay.
// Per-yarn randomness repeats every gcd(YARNS, ACROSS) yarns, so the tile still wraps seamlessly.
const YARNS = 12;
const ACROSS = 28;
const DISTINCT = 4; // gcd(YARNS, ACROSS)
const FIBRES = 10; // fine fibre streaks per yarn
const BLOTCH = 8; // cells of uneven wear across the tile

const ropePixelCache = new Map<string, { colorData: Uint8Array; normalData: Uint8Array }>();
const cutFacePixelCache = new Map<string, Uint8Array>();

/**
 * Fibre detail for one strand, drawn procedurally so there are no image assets to manage.
 * The strands themselves are geometry (see RopeMesh); this only adds the fine twisted yarns.
 */
export function createRopeMaterial(
  color: THREE.ColorRepresentation,
  anisotropy: number,
): THREE.MeshPhysicalMaterial {
  const colorKey = new THREE.Color(color).getHexString();
  let cached = ropePixelCache.get(colorKey);
  if (!cached) {
    const height = new Float32Array(SIZE * SIZE);
    const albedo = new Float32Array(SIZE * SIZE);
    const tone = new Float32Array(SIZE * SIZE);
    // Repeatable per-fibre randomness, so every yarn is a little different but the tile still wraps.
    const hash = (i: number) => {
      const h = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      return h - Math.floor(h);
    };
    const smooth = (t: number) => t * t * (3 - 2 * t);
    const wrap = (i: number, n: number) => ((i % n) + n) % n;
    // Smooth 1D noise on a periodic lattice of n cells.
    const noise1 = (x: number, n: number, salt: number) => {
      const i = Math.floor(x);
      const a = hash(wrap(i, n) + salt);
      return a + (hash(wrap(i + 1, n) + salt) - a) * smooth(x - i);
    };
    // Smooth 2D noise on a BLOTCH × BLOTCH lattice that wraps with the tile.
    const noise2 = (u: number, v: number) => {
      const x = u * BLOTCH;
      const y = v * BLOTCH;
      const i = Math.floor(x);
      const j = Math.floor(y);
      const c = (di: number, dj: number) =>
        hash(wrap(i + di, BLOTCH) * 31 + wrap(j + dj, BLOTCH) + 900);
      const sx = smooth(x - i);
      const sy = smooth(y - j);
      return (
        (c(0, 0) * (1 - sx) + c(1, 0) * sx) * (1 - sy) + (c(0, 1) * (1 - sx) + c(1, 1) * sx) * sy
      );
    };
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const u = x / SIZE;
        const v = y / SIZE;
        const along = YARNS * u + ACROSS * v; // along a yarn
        // Minus: the yarns lean back against the strand's twist, so on the surface they lie nearly
        // along the rope itself.
        const w = YARNS * v - ACROSS * u; // across the yarns: one unit per yarn
        const k = Math.floor(w);
        const f = w - k;
        const yarnId = wrap(k, DISTINCT);
        const thick = 0.8 + 0.4 * hash(yarnId + 50); // some yarns sit proud of their neighbours
        // Each yarn is a rounded ridge with a dark crease where it meets the next.
        const yarn = thick * Math.sin(Math.PI * f) ** 0.5;
        // Fibres run along the yarn as fine light and dark streaks.
        const streak = noise1(w * FIBRES, DISTINCT * FIBRES, 0);
        const fleck = noise1(
          w * FIBRES * 2 + 0.5 * noise1(along, DISTINCT, 70),
          DISTINCT * FIBRES * 2,
          200,
        );
        const wear = noise2(u, v);
        // Which of the fibre tones this streak is: pale straw, golden tan or darker brown.
        tone[y * SIZE + x] = noise1(w * FIBRES * 0.5 + 3 * wear, DISTINCT * FIBRES * 0.5, 400);
        height[y * SIZE + x] = 0.45 * yarn + 0.3 * streak + 0.25 * fleck;
        albedo[y * SIZE + x] =
          (0.7 + 0.3 * Math.min(1, yarn)) *
          (0.78 + 0.22 * streak) *
          (0.9 + 0.1 * fleck) *
          (0.94 + 0.06 * wear) *
          (0.94 + 0.06 * hash(yarnId + 20));
      }

    // Tones in sRGB, since the colour texture is stored that way.
    const tan = new THREE.Color(color).convertLinearToSRGB();
    const straw = tan.clone().lerp(new THREE.Color(0xf3e4c0), 0.55);
    const brown = tan.clone().multiplyScalar(0.62).lerp(new THREE.Color(0x6b5038), 0.2);
    const colorData = new Uint8Array(SIZE * SIZE * 4);
    const normalData = new Uint8Array(SIZE * SIZE * 4);
    const at = (x: number, y: number) => height[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const i = y * SIZE + x;
        // Natural fibre is never one colour: blend straw → tan → brown, plus a little grain.
        const t = tone[i];
        const c = t < 0.5 ? straw.clone().lerp(tan, t * 2) : tan.clone().lerp(brown, t * 2 - 1);
        const g = albedo[i] * (0.97 + 0.06 * hash(i + 7000));
        colorData.set(
          [255 * Math.min(1, c.r * g), 255 * Math.min(1, c.g * g), 255 * Math.min(1, c.b * g), 255],
          i * 4,
        );
        const dx = at(x + 1, y) - at(x - 1, y);
        const dy = at(x, y + 1) - at(x, y - 1);
        const len = Math.hypot(dx, dy, 1);
        normalData.set(
          [
            (0.5 - (0.5 * dx) / len) * 255,
            (0.5 - (0.5 * dy) / len) * 255,
            (0.5 + 0.5 / len) * 255,
            255,
          ],
          i * 4,
        );
      }
    cached = { colorData, normalData };
    ropePixelCache.set(colorKey, cached);
  }
  const { colorData, normalData } = cached;

  const texture = (data: Uint8Array, srgb: boolean) => {
    const tex = new THREE.DataTexture(data, SIZE, SIZE);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = anisotropy;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, // the fibre tones live in the texture
    side: THREE.DoubleSide, // nowhere on the rope may read as see-through, even cut ends seen up close
    vertexColors: true, // strand-groove occlusion baked per vertex by RopeMesh
    map: texture(colorData, true),
    normalMap: texture(normalData, false),
    normalScale: new THREE.Vector2(2.2, 2.2),
    // Dry natural fibre: matte, barely any specular, and lit ridges go cream rather than brighter.
    roughness: 0.88,
    specularIntensity: 0.2,
    specularColor: new THREE.Color(0xfff2dc),
    sheen: 0.12, // sheen ignores vertex shading, so more would light up grooves and charred tips
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(0xf6e8cf),
  });
  material.userData.fibreColor = new THREE.Color(color); // for loose fibres drawn by RopeMesh
  return material;
}

/**
 * The cut end of one strand: a bundle of yarn ends packed together, each a small disc of fibre
 * tips with a dark gap around it. Mapped flat across the strand's cut face by RopeMesh.
 */
export function createCutFaceTexture(color: THREE.ColorRepresentation): THREE.DataTexture {
  const size = 512;
  const colorKey = new THREE.Color(color).getHexString();
  let data = cutFacePixelCache.get(colorKey);
  if (!data) {
    const tone = new THREE.Color(color).convertLinearToSRGB();
    let seed = 3;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // Yarns in a jittered hex pack filling the disc.
    const yarns: [number, number, number, number][] = []; // x, y, radius, shade
    const step = 0.075; // ~550 yarns per strand
    const span = Math.ceil(1 / step);
    for (let row = -span; row <= span; row++)
      for (let col = -span; col <= span; col++) {
        const x = (col + (row % 2) * 0.5) * step + (rand() - 0.5) * 0.4 * step;
        const y = row * step * 0.866 + (rand() - 0.5) * 0.4 * step;
        if (Math.hypot(x, y) < 0.9)
          yarns.push([x, y, step * (0.6 + 0.13 * rand()), 0.6 + 0.2 * rand()]); // as dark as the rope's shaded sides, not brighter
      }
    // Bucket yarns on a grid one yarn wide, so each pixel only checks its neighbourhood.
    const cells = Math.ceil(2 / step) + 2;
    const cellOf = (v: number) => Math.min(cells - 1, Math.max(0, Math.floor((v + 1) / step)));
    const grid: (typeof yarns)[] = Array.from({ length: cells * cells }, () => []);
    for (const ya of yarns) grid[cellOf(ya[1]) * cells + cellOf(ya[0])].push(ya);
    data = new Uint8Array(size * size * 4);
    for (let py = 0; py < size; py++)
      for (let px = 0; px < size; px++) {
        const x = (px / size) * 2 - 1;
        const y = (py / size) * 2 - 1;
        let best = Infinity;
        let second = Infinity;
        let yarn = yarns[0];
        const gx = cellOf(x);
        const gy = cellOf(y);
        for (let cy = Math.max(0, gy - 2); cy <= Math.min(cells - 1, gy + 2); cy++)
          for (let cx = Math.max(0, gx - 2); cx <= Math.min(cells - 1, gx + 2); cx++)
            for (const ya of grid[cy * cells + cx]) {
              const d = Math.hypot(x - ya[0], y - ya[1]) - ya[2];
              if (d < best) {
                second = best;
                best = d;
                yarn = ya;
              } else if (d < second) second = d;
            }
        // Yarns are squeezed together: each pixel belongs to its nearest yarn, with a thin dark
        // seam where two yarns meet and a darker gap outside the bundle.
        const speckle = 0.82 + 0.3 * rand();
        const seam = Math.min(1, (second - best) / (0.12 * step));
        let v: number;
        if (best > 0) v = 0.24 + 0.08 * rand();
        else v = yarn[3] * speckle * (0.55 + 0.45 * seam);
        data.set(
          [
            255 * Math.min(1, tone.r * v),
            255 * Math.min(1, tone.g * v),
            255 * Math.min(1, tone.b * v),
            255,
          ],
          (py * size + px) * 4,
        );
      }
    cutFacePixelCache.set(colorKey, data);
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
