import type { KnotDef, Vec3 } from "./types";

// The square (reef) knot joining two ropes, tied through a bight; the camera looks from +z, so +z is
// the bottom of the screen. Both ropes start straight: tan (rope 1) from the right, its end reaching
// well past the origin, and blue (rope 0) from the left, a little nearer the camera. Tan's end folds back to the right into a C:
// the standing part on the near side, the curve round the left of the origin, the tail on the far
// side. Blue's end slides in under the curve and out over the near leg, goes under both legs, back
// over the far leg and down through the C beside its own standing part, so both blue parts leave the
// same way. Pull all four ends.
const R = 0.012;
const W = 0.044; // radius of tan's C: tight, so the curve takes little of the tail
// The C's tail runs out to x = 0.285 on the far side: short, so it ends as long as blue's tail. Blue's
// end swings round its tip, which ties the same knot as passing under it.
const TAN_END = 0.285;
const BLUE_Z = 0.015; // blue runs inside the C a little to the near side, leaving room for its end
const BLUE_END: Vec3 = [-0.18, R, 0.12]; // blue's end starts clear of where tan's curve rolls
const BLUE = 1.37;
const TAN = 0.85 + Math.PI * W + TAN_END;
const tanStart: Vec3[] = [
  [0.85, R, W],
  [0.85 - TAN, R, W],
];
const blueStart: Vec3[] = [[BLUE_END[0] - BLUE, R, BLUE_END[2]], BLUE_END];
// Fraction along each rope of a point given by its distance from the standing end.
const blue = (d: number) => d / BLUE;
const tan = (d: number) => d / TAN;
const T_RIM = 0.85; // tan: where the C starts (near leg at x = 0)
const T_FAR = T_RIM + Math.PI * W; // and where the far leg starts

export const squareKnot: KnotDef = {
  id: "square-knot",
  name: "Square knot",
  summary:
    "Also called the reef knot. Ties two ends together snugly, for bundles, bandages and sail reefing; not for loads that matter.",
  ropes: [
    { length: BLUE, radius: R, color: "#2f5fb3", start: blueStart },
    { length: TAN, radius: R, start: tanStart },
  ],
  duration: 13.9,
  steps: [
    { t: 0, title: "Fold the tan end back into a C" },
    { t: 2.6, title: "Blue end: in under the C's curve and out over its near leg" },
    { t: 5.2, title: "Blue end: under both legs of the C" },
    { t: 7.3, title: "Blue end: back over the far leg and down through the C" },
    { t: 9.9, title: "Pull the ends, then the standing parts, to set the knot" },
    { t: 13.3, title: "Done: a square knot" },
  ],
  guides: [
    // Tan's end leads the fold to the right along the far side; the curve rolls along behind it and
    // stops round the origin. A hand holds where the C will start.
    { rope: 1, at: tan(T_RIM), grab: 0.2, path: [{ t: 2.8 }] },
    {
      rope: 1,
      at: 1,
      grab: 0.2,
      path: [
        { t: 0.6, p: [0.85 - TAN + 0.04, 0.03, -W] },
        { t: 2.6, p: [TAN_END, R, -W] },
      ],
    },
    // Lift the C's curve while blue's end slides in under it.
    {
      rope: 1,
      at: tan(T_RIM + (Math.PI * W) / 2),
      grab: 2.6,
      path: [{ t: 3.0, p: [-W, 0.05, 0] }, { t: 3.7 }, { t: 4.1, p: [-W, R, 0] }, { t: 4.2 }],
    },
    // Hold blue's standing part and the C's curve still while the end is worked.
    { at: blue(0.5), grab: 4.4, path: [{ t: 9.9 }] },
    {
      rope: 1,
      at: tan(T_RIM + 0.75 * Math.PI * W),
      grab: 4.2,
      path: [
        { t: 7.7 },
        // Lift the rim's far corner so the end can dive under it.
        { t: 8.2, p: [-0.035, 0.055, -0.035] },
        { t: 9.4 },
        { t: 9.7, p: [-0.035, R, -0.035] },
        { t: 9.9 },
      ],
    },
    // One hand pinches both legs of the C and lifts them so the end can pass under.
    {
      rope: 1,
      at: tan(T_RIM - 0.28),
      grab: 5.2,
      path: [{ t: 5.7, p: [0.28, 0.08, W] }, { t: 6.9 }, { t: 7.3, p: [0.28, R, W] }, { t: 9.9 }],
    },
    {
      rope: 1,
      at: tan(T_FAR + 0.28),
      grab: 5.2,
      path: [{ t: 5.7, p: [0.28, 0.08, -W] }, { t: 6.9 }, { t: 7.3, p: [0.28, R, -W] }, { t: 9.9 }],
    },
    {
      at: 1,
      grab: 2.6,
      force: 90, // drags the whole blue rope in; lighter, it lags and misses the near leg
      path: [
        // Slides in under the lifted curve, over the near leg and out to the right.
        { t: 3.3, p: [-0.1, R, 0.02] },
        { t: 4.0, p: [0.06, R, BLUE_Z] },
        { t: 4.3, p: [0.1, 0.05, W] },
        { t: 4.6, p: [0.14, R, 0.1] },
        { t: 5.2, p: [0.53, R, 0.1] },
        // Swings round like a page under the lifted near leg and round the far leg's tip, curls
        // over the far leg into the C, then goes down under the rim's far corner and out.
        { t: 5.9, p: [0.44, R, 0.0] },
        { t: 6.3, p: [0.35, R, -0.08] },
        { t: 6.7, p: [0.27, R, -0.16] },
        { t: 7.1, p: [0.19, R, -0.19] },
        { t: 7.45, p: [0.19, 0.06, -0.1] },
        { t: 7.75, p: [0.15, 0.06, -0.03] },
        { t: 8.05, p: [0.1, R, -0.015] },
        { t: 8.4, p: [0.03, R, -0.02] },
        { t: 8.8, p: [-0.03, R, -0.04] },
        { t: 9.3, p: [-0.09, R, -0.1] },
        { t: 9.9, p: [-0.12, R, -0.18] },
      ],
    },

    // Pull both ends a little up the screen together, mirrored about the knot, and hold them while
    // the standing parts are pulled apart, so blue's loop and tan's C tighten at the same time; then
    // let go so the knot settles back onto the standing parts' line.
    {
      at: 1,
      grab: 9.9,
      compliance: 0.001,
      force: 450,
      path: [
        { t: 10.7, p: [-0.16, 0.04, -0.16] },
        { t: 11.4, p: [-0.12, 0.04, -0.13] },
        { t: 12.4 },
      ],
    },
    {
      rope: 1,
      at: 1,
      grab: 9.9,
      compliance: 0.001,
      force: 450,
      path: [{ t: 10.7, p: [0.24, 0.04, -0.16] }, { t: 11.4, p: [0.2, 0.04, -0.13] }, { t: 12.4 }],
    },
    {
      at: 0,
      grab: 10.7,
      compliance: 0.001,
      force: 450,
      path: [{ t: 12.5, p: [-1.15, 0.04, 0] }, { t: 13.3 }],
    },
    {
      rope: 1,
      at: 0,
      grab: 10.7,
      compliance: 0.001,
      force: 450,
      path: [{ t: 12.5, p: [1.15, 0.04, 0] }, { t: 13.3 }],
    },
  ],
};
