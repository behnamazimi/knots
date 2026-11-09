// Draws the newest stargazers' knots as one SVG for the repo README: the real rope and knot
// pictures, each avatar tied on, the spare pile and an empty spot for the next star. GitHub shows
// README images through a proxy that blocks outside links, so every picture is embedded.
// The stargazers workflow renders it after each new star and commits it next to the feed.
// Run: node tools/readme-rope.mjs                 public/stargazers.json → .github/stargazer-rope-<hash>.svg
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { jitter, knotFor, ropeLayout } from "../src/app/features/stargazers/layout.ts";
import { decode } from "./stargazers.mjs";

const [src, out] = ["public/stargazers.json", ".github/stargazer-rope.svg"];
const root = new URL("..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root));

const SHOW = 8; // newest stars on the rope
const W = 880;
const H = 250;
const t = 9; // rope diameter, px
const PX = 32; // pixels per rope diameter in the pictures (tools/stargazer-sprites.ts)
const TIP = 5; // the rope's end sits TIP diameters into tip.png
const AVATAR = 2.4; // avatar radius, in rope diameters
const SPARE = 7; // spare pile loop size, in rope diameters
const ACCENT = "#b9522c";

const stars = decode(JSON.parse(read(src)));
const total = stars.length;
const shown = stars.slice(-SHOW);

/** A PNG (or any fetched picture) as a data URL, with its pixel size. */
const png = (bytes) => ({
  url: `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`,
  w: bytes.readUInt32BE(16),
  h: bytes.readUInt32BE(20),
});
const sprite = (name) => png(read(`public/stargazers/${name}.png`));
const avatars = await Promise.all(
  shown.map(async ({ id }) => {
    const res = await fetch(`https://avatars.githubusercontent.com/u/${id}?v=4&s=64`);
    const type = res.headers.get("content-type") ?? "image/png";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  }),
);

// Knot spacing as on the stargazer page, fitted to the room left of the spare pile.
const room = W - 250;
const layout = ropeLayout(
  shown.map((s) => s.time),
  shown.length + 1, // one more spot: the next star's
);
const lastAt = layout.knots[layout.knots.length - 1] ?? 0;
const k = Math.min(1, (room - 4 * t) / ((lastAt + 6) * t)); // squeeze a long lull to fit
// A short rope slides right, so its knots lead up to the next star's spot instead of huddling at
// the left edge; the spot is never left of the middle.
const fitted = layout.knots.map((d) => 3 * t + d * t * k);
const next = Math.max(fitted.length ? fitted[fitted.length - 1] + 9 * t : 0, W * 0.45);
const slide = fitted.length ? next - 9 * t - fitted[fitted.length - 1] : 0;
const knotX = fitted.map((x) => x + slide);
const end = next + 10 * t;

const y0 = 140;
const wander = (x) => y0 + 12 * Math.sin(x / (30 * t) + 1.3) + 7 * Math.sin(x / (13 * t) + 4.1);
const f = (n) => Math.round(n * 100) / 100;

const rope = sprite("rope");
const parts = [];
/** One slice of the rope picture from (x0, y0) to (x1, y1), `s` px into its pattern. */
const lay = (x0, y0, x1, y1, s) => {
  const l = Math.hypot(x1 - x0, y1 - y0);
  const a = Math.atan2(y1 - y0, x1 - x0);
  const off = ((s * PX) / t) % rope.w;
  parts.push(
    `<g transform="matrix(${f(Math.cos(a))} ${f(Math.sin(a))} ${f(-Math.sin(a))} ${f(Math.cos(a))} ${f(x0)} ${f(y0)})"><svg y="${-t}" width="${f(l + 0.8)}" height="${2 * t}" viewBox="${f(off)} 0 ${f((l * PX) / t)} ${rope.h}" preserveAspectRatio="none"><use href="#rope"/></svg></g>`,
  );
};

// The rope, from the left edge (where it fades in) to the spare pile.
for (let x = -2 * t; x < end; x += 2 * t) lay(x, wander(x), x + 2 * t, wander(x + 2 * t), x);
// The spare pile: the same uneven loops as on the stargazer page.
const ea = Math.atan(wander(end + 1) - wander(end));
const ey = wander(end);
const R = SPARE * t;
const [px, py] = [end + R * 0.9, ey + R * 0.8];
const loop = (a) => {
  const r = R * (1 + 0.22 * Math.sin(1.3 * a + 0.7) + 0.12 * Math.sin(2.9 * a + 2.1));
  return [
    px + t * 2.2 * Math.sin(0.45 * a + 1.1) - r * Math.cos(a),
    py + t * 1.6 * Math.cos(0.6 * a + 0.4) - r * 0.8 * Math.sin(a),
  ];
};
const pile = [];
const START = Math.PI / 2;
const [sx0, sy0] = loop(START);
const c1 = [end + Math.cos(ea) * t * 4, ey + Math.sin(ea) * t * 4];
const c2 = [sx0 - t * 4, sy0];
for (let i = 1; i <= 10; i++) {
  const u = i / 10;
  const v = 1 - u;
  pile.push([
    end * v ** 3 + 3 * c1[0] * v * v * u + 3 * c2[0] * v * u * u + sx0 * u ** 3,
    ey * v ** 3 + 3 * c1[1] * v * v * u + 3 * c2[1] * v * u * u + sy0 * u ** 3,
  ]);
}
for (let a = START + 0.1; a <= START + Math.PI * 2 * 3.6; a += 0.1) pile.push(loop(a));
let [lx, ly] = pile[pile.length - 1];
let dir = Math.atan2(ly - pile[pile.length - 2][1], lx - pile[pile.length - 2][0]);
for (let i = 0; i < 16; i++) {
  const outward = Math.atan2(ly - py, lx - px);
  dir += Math.atan2(Math.sin(outward - dir), Math.cos(outward - dir)) * 0.18;
  [lx, ly] = [lx + Math.cos(dir) * t, ly + Math.sin(dir) * t];
  pile.push([lx, ly]);
}
let along = end;
let [ax, ay] = [end, ey];
for (const [x, y] of pile) {
  lay(ax, ay, x, y, along);
  along += Math.hypot(x - ax, y - ay);
  [ax, ay] = [x, y];
}
// The rope's cut end, out of the pile.
const tip = sprite("tip");
parts.push(
  `<use href="#tipimg" transform="translate(${f(lx)} ${f(ly)}) rotate(${f((dir * 180) / Math.PI)})${Math.cos(dir) < 0 ? " scale(1 -1)" : ""}" x="${-TIP * t}" y="${f(((-tip.h / PX) * t) / 2)}"/>`,
);

// Each star's knot and avatar, as on the stargazer page.
const r = AVATAR * t;
const ties = [];
const knotsSvg = [];
const faces = [];
const used = new Set();
shown.forEach((star, i) => {
  // On the chord between the rope under its picture's two ends, so both ends lie on the rope.
  const kind = knotFor(star.id).id;
  const half = (sprite(kind).w / PX / 2) * t;
  const x = knotX[i];
  const y = (wander(x - half) + wander(x + half)) / 2;
  const a = Math.atan2(wander(x + half) - wander(x - half), 2 * half);
  const side = (total - shown.length + i) % 2 ? 1 : -1;
  used.add(kind);
  const off = t * 1.3 + r + jitter(i, 1) * t * 1.6;
  const lean = a + (jitter(i, 2) - 0.5) * 0.7;
  const [fx, fy] = [x - Math.sin(lean) * off * side, y + Math.cos(lean) * off * side];
  ties.push(`M${f(x)} ${f(y)}L${f(fx)} ${f(fy)}`);
  knotsSvg.push(
    `<use href="#${kind}" transform="translate(${f(x)} ${f(y)}) rotate(${f((a * 180) / Math.PI)})"/>`,
  );
  const newest = i === shown.length - 1;
  // The newest star: a ring pulses out round it. The face itself never animates, so a viewer
  // that shows a still frame of the picture still shows it.
  faces.push(
    `<image href="${avatars[i]}" x="${f(fx - r)}" y="${f(fy - r)}" width="${f(2 * r)}" height="${f(2 * r)}" clip-path="url(#round)"/><circle cx="${f(fx)}" cy="${f(fy)}" r="${f(r)}" fill="none" stroke="${newest ? ACCENT : "#fffdf9"}" stroke-width="2"/>` +
      (newest
        ? `<circle class="ring" cx="${f(fx)}" cy="${f(fy)}" r="${f(r)}" style="transform-origin:${f(fx)}px ${f(fy)}px"/>`
        : ""),
  );
});

// The next star's spot: an empty, dashed avatar tied on, waiting.
const nx = next;
const ny = wander(nx);
const nside = total % 2 ? 1 : -1;
const nfy = ny + (t * 1.3 + r + t * 0.8) * nside;
ties.push(`M${f(nx)} ${f(ny)}L${f(nx)} ${f(nfy)}`);
const you = `<g class="wait" style="transform-origin:${f(nx)}px ${f(nfy)}px"><circle cx="${f(nx)}" cy="${f(nfy)}" r="${f(r)}" class="slot"/><text x="${f(nx)}" y="${f(nfy + 5)}" class="q">you?</text></g>`;

const defs = [
  `<image id="ropeimg" href="${rope.url}" width="${rope.w}" height="${rope.h}"/>`,
  `<g id="rope"><use href="#ropeimg"/><use href="#ropeimg" x="${rope.w}"/></g>`,
  `<image id="tipimg" href="${tip.url}" width="${f((tip.w / PX) * t)}" height="${f((tip.h / PX) * t)}"/>`,
  ...[...used].map((kind) => {
    const p = sprite(kind);
    const [w, h] = [(p.w / PX) * t, (p.h / PX) * t];
    return `<image id="${kind}" href="${p.url}" x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}"/>`;
  }),
  `<clipPath id="round" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath>`,
  // The rope fades in from the left edge.
  `<linearGradient id="fade"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.08" stop-color="#fff"/></linearGradient>`,
  `<mask id="edge"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>`,
];

const label = Math.min(...pile.map(([, y]) => y), ey) - t * 1.5;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif">
<title>${total.toLocaleString("en")} knots tied: every GitHub star ties a knot on the stargazer rope</title>
<style>
.ink{fill:#23201c}.muted{fill:#6b645b}.accent{fill:${ACCENT}}
.slot{fill:none;stroke:${ACCENT};stroke-width:2;stroke-dasharray:5 4}
.q{fill:${ACCENT};font-size:12px;font-weight:700;text-anchor:middle}
.ring{fill:none;stroke:${ACCENT};stroke-width:2;animation:ring 2s ease-out infinite}
.wait{animation:wait 1.8s ease-in-out infinite}
@keyframes ring{from{transform:scale(1);opacity:.9}to{transform:scale(1.7);opacity:0}}
@keyframes wait{50%{transform:scale(1.08)}}
@media (prefers-color-scheme:dark){.ink{fill:#f3eee6}.muted{fill:#b3aa9e}.accent,.q{fill:#e0794f}.slot,.ring{stroke:#e0794f}}
@media (prefers-reduced-motion:reduce){.ring,.wait{animation:none}}
</style>
<defs>${defs.join("")}</defs>
<text x="24" y="40" class="ink" font-size="28" font-weight="800">${total.toLocaleString("en")} <tspan class="muted" font-size="15" font-weight="600">${total === 1 ? "knot" : "knots"} tied</tspan></text>
<text x="24" y="62" class="muted" font-size="13">Every GitHub star ties a knot on the stargazer rope.</text>
<g mask="url(#edge)">${parts.join("")}</g>
<path d="${ties.join("")}" stroke="#6b645b" stroke-opacity="0.6" fill="none"/>
${knotsSvg.join("")}
${faces.join("")}
${you}
<text x="${f(px)}" y="${f(label)}" class="accent" font-size="12" font-weight="700" text-anchor="middle">your knot goes here</text>
<text x="${W - 24}" y="40" class="ink" font-size="14" font-weight="700" text-anchor="end">★ Star the repo to tie knot #${(total + 1).toLocaleString("en")}</text>
</svg>
`;
// GitHub caches README images by address, so each picture gets a new file name (its hash) and the
// README links that; the old ones are deleted.
const version = createHash("sha1").update(svg).digest("hex").slice(0, 8);
const file = out.replace(".svg", `-${version}.svg`);
for (const old of readdirSync(new URL(".github/", root)))
  if (/^stargazer-rope.*\.svg$/.test(old)) rmSync(new URL(`.github/${old}`, root));
const readme = new URL("README.md", root);
const before = readFileSync(readme, "utf8");
const after = before.replace(/\.github\/stargazer-rope[\w-]*\.svg(\?v=\w+)?/g, file);
if (after !== before) writeFileSync(readme, after);
const path = new URL(file, root);
mkdirSync(dirname(path.pathname), { recursive: true });
writeFileSync(path, svg);
console.log(`${file}: ${shown.length} of ${total} stars, ${Math.round(svg.length / 1024)} KB`);
