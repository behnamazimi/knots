import type { KnotDef, Vec3 } from "./types";

// The "6 and 9" Zeppelin bend with two ropes; the camera looks from +z, so +z is the bottom of the screen.
// Both ends start bent into U-shaped bights round the origin: red (rope 1) comes in from the right on
// the far side, turns left round a small U (radius RR) and runs back right on the near side; blue
// (rope 0) comes in from the left on the near side, turns right round a larger U (radius BR) lying
// over red, and runs back left on the far side. Each end then crosses its own standing part, closing
// its U into a loop: red's end goes UNDER (the 9), blue's goes OVER (the 6, on top). Both loops run
// anticlockwise on screen. Blue's tail wraps under the near rims and comes up through the middle;
// red's tail wraps over the far rims and goes down through the middle, past it. Pull all four ends.
const R = 0.012;
const RR = 0.045; // red U radius
const BR = 0.052; // blue U radius: round the outside of red's, so it rests on red only where it crosses
const RED_END = 0.47; // red's tail runs out to x = 0.47 on the near side
const BLUE_END = -0.54; // blue's tail runs out to x = -0.54 on the far side

/** Straight in from `from` along z = side * r, round a U of radius r about the origin, straight out to `to`. */
function bight(from: number, r: number, side: 1 | -1, to: number, lifted: boolean): Vec3[] {
  const dir = Math.sign(-from); // heading of the standing part
  const points: Vec3[] = [[from, R, side * r]];
  for (let deg = 90; deg >= -90; deg -= 15) {
    const a = (deg * Math.PI) / 180;
    const z = side * r * Math.sin(a);
    // Blue's U crosses red's runs (z = ±RR) on top of them.
    const y = lifted && Math.abs(Math.abs(z) - RR) < 0.025 ? 3.2 * R : R;
    points.push([dir * r * Math.cos(a), y, z]);
  }
  points.push([to, R, -side * r]);
  return points;
}
const length = (p: Vec3[]) =>
  p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1], q[2] - p[i][2]), 0);

const blueStart = bight(-0.92, BR, 1, BLUE_END, true);
const redStart = bight(0.83, RR, -1, RED_END, false);
const BLUE = length(blueStart);
const RED = length(redStart);
// Fraction along each rope of a point given by its distance from the standing end.
const blue = (d: number) => d / BLUE;
const red = (d: number) => d / RED;
const B_IN = 0.92; // blue: where the U starts (bottom), and its top
const B_TOP = B_IN + Math.PI * BR;
const R_IN = 0.83; // red: where the U starts (top), and its bottom
const R_LOW = R_IN + Math.PI * RR;

export const zeppelin: KnotDef = {
  id: "zeppelin",
  name: "Zeppelin bend",
  addedDate: "2026-10-31",
  summary:
    "Joins two ropes securely. It holds under heavy load and still unties easily afterwards.",
  ropes: [
    { length: BLUE, radius: R, color: "#2f5fb3", start: blueStart },
    { length: RED, radius: R, start: redStart },
  ],
  duration: 11.7,
  // Each move starts while the one before it finishes, so the hands never all stand still.
  steps: [
    { t: 0, title: "Bend both ends into U shapes, blue over red" },
    { t: 0.2, title: "Red end: under its own rope, closing a loop" },
    { t: 2.0, title: "Blue end: over its own rope, closing a loop on top" },
    { t: 4.0, title: "Blue tail: under the near side and up through both loops" },
    { t: 6.4, title: "Red tail: over the far side and down through both loops" },
    { t: 8.9, title: "Pull the tails, then the standing parts, to set the knot" },
    { t: 11.1, title: "Done: a Zeppelin bend" },
  ],
  guides: [
    // Hands hold each U where it lies, so drawing the tails round cannot drag the loops out of place.
    // The near rims (red's bottom, blue's bottom) lift as blue's tail comes round, so both tails can pass under them.
    { rope: 1, at: red(R_IN), grab: 0.2, path: [{ t: 8.9 }] },
    {
      rope: 1,
      at: red(R_LOW),
      grab: 0.2,
      path: [
        { t: 4.4 },
        { t: 4.9, p: [0, 0.04, RR] },
        { t: 8.4 },
        { t: 8.8, p: [0, R, RR] },
        { t: 8.9 },
      ],
    },
    { at: blue(B_TOP), grab: 2.0, path: [{ t: 8.9 }] },
    {
      at: blue(B_IN),
      grab: 2.0,
      path: [
        { t: 4.4 },
        { t: 4.9, p: [0, 0.045, BR] },
        { t: 8.4 },
        { t: 8.8, p: [0, R, BR] },
        { t: 8.9 },
      ],
    },

    // Red: lift the standing part beyond the loop so the end can swing under it.
    {
      rope: 1,
      at: red(R_IN - 0.45),
      grab: 0.2,
      path: [{ t: 0.7, p: [0.45, 0.07, -RR] }, { t: 2.0 }, { t: 2.4, p: [0.45, R, -RR] }],
    },
    {
      rope: 1,
      at: 1,
      grab: 0.2,
      force: 45,
      path: [
        // The tail swings round the right of the U like a page, low on the table, under the lifted
        // standing part to the far side.
        { t: 1.1, p: [0.43, R, -0.18] },
        { t: 1.7, p: [0.3, R, -0.27] },
        { t: 2.4, p: [0.15, R, -0.33] },
        { t: 6.4 },

        // The tuck: back over both far rims, down through the middle, out under the near rims.
        { t: 7.0, p: [0.06, 0.04, -0.22] },
        { t: 7.5, p: [0.02, 0.06, -0.1] },
        { t: 7.9, p: [0.02, 0.05, -0.03] },
        { t: 8.3, p: [0.02, R, 0.04] },
        { t: 8.9, p: [0.02, R, 0.19] },
      ],
    },

    // Blue: the hand lifts the tail and swings it round the top of the U like a page, over its own
    // standing part, and without stopping curves it back under both near rims, up through the
    // middle and over the far rims.
    {
      at: 1,
      grab: 2.0,
      force: 45,
      path: [
        { t: 2.6, p: [-0.52, 0.08, 0.12] },
        { t: 3.2, p: [-0.39, 0.1, 0.32] },
        { t: 3.7, p: [-0.22, 0.06, 0.45] },
        { t: 4.2, p: [-0.15, R, 0.42] },
        { t: 4.8, p: [-0.07, R, 0.27] },
        { t: 5.3, p: [-0.02, R, 0.12] },
        { t: 5.7, p: [-0.02, R, 0.04] },
        { t: 6.1, p: [-0.02, 0.05, -0.02] },
        { t: 6.5, p: [-0.02, 0.06, -0.11] },
        { t: 6.9, p: [-0.02, R, -0.17] },
        { t: 8.9 },
      ],
    },

    // Pull the tails out to their sides, drawing both loops in, then the standing parts apart.
    {
      at: 0,
      grab: 9.3,
      compliance: 0.001,
      force: 450,
      path: [{ t: 10.7, p: [-1.3, 0.04, 0] }, { t: 11.1 }],
    },
    {
      rope: 1,
      at: 0,
      grab: 9.3,
      compliance: 0.001,
      force: 450,
      path: [{ t: 10.7, p: [1.2, 0.04, 0] }, { t: 11.1 }],
    },
    {
      at: 1,
      grab: 8.9,
      compliance: 0.001,
      force: 450,
      path: [{ t: 10.0, p: [0.0, 0.04, -0.4] }, { t: 11.1 }],
    },
    {
      rope: 1,
      at: 1,
      grab: 8.9,
      compliance: 0.001,
      force: 450,
      path: [{ t: 10.0, p: [0.0, 0.04, 0.4] }, { t: 11.1 }],
    },
  ],
};
