import type { KnotDef } from "./types";

// The rope lies along x from -0.6 (standing end) to 0.6 (working end); the camera looks from +z.
// `at` is the fraction along the rope, so a point starts at x = at * 1.2 - 0.6.
const R = 0.012;

export const overhand: KnotDef = {
  id: "overhand",
  name: "Overhand knot",
  addedDate: "2026-10-30",
  summary:
    "The simplest knot and the base of many others. Use it as a stopper at the end of a rope.",
  ropes: [
    {
      length: 1.2,
      radius: R,
      start: [
        [-0.6, R, 0],
        [0.6, R, 0],
      ],
    },
  ],
  duration: 7.6,
  steps: [
    { t: 0, title: "Lay the rope out straight" },
    { t: 0.4, title: "Make a loop: bring the working end over the standing part" },
    { t: 3, title: "Tuck the end under and up through the loop" },
    { t: 4.6, title: "Pull both ends to tighten" },
    { t: 6.6, title: "Done: an overhand knot" },
  ],
  guides: [
    // Phase 1: one hand carries the end round and over the rope; the rope behind it falls into a
    // circle (centre about (0.06, 0)) beside the held point, crossing at its left. The end goes on to
    // the far side, leaving enough tail for the tuck.
    // Holds the standing part until the pull has taken over, or the end being drawn out drags it across the table.
    { at: 0.5, grab: 0.4, path: [{ t: 5.0 }] },
    {
      at: 1,
      grab: 0.4,
      force: 45, // drags the heavy rope round; lighter, it lags and then whips
      path: [
        // Slides round on the table, so the rope behind follows it round instead of cutting across.
        { t: 1.0, p: [0.35, R, 0.1] },
        { t: 1.55, p: [0.12, R, 0.14] },
        { t: 2.0, p: [-0.03, R, 0.14] },
        { t: 2.25, p: [-0.09, R, 0.09] },
        // Lifts only to cross the standing part, head on, and settles on the far side without a rush;
        // it goes this far to leave enough tail for the tuck.
        { t: 2.5, p: [-0.09, 0.045, 0.02] },
        { t: 2.75, p: [-0.09, 0.03, -0.09] },
        { t: 3.0, p: [-0.08, R, -0.2] },
      ],
    },

    // Phase 2: lift the far side of the circle, and pass the end under it, up through the middle
    // and out over the near side.
    {
      at: 0.6,
      grab: 3.0,
      path: [{ t: 3.3, p: [0.08, 0.05, -0.045] }, { t: 4.0 }, { t: 4.3, p: [0.08, R, -0.045] }],
    },
    {
      at: 1,
      grab: 3.0,
      force: 45, // drags the heavy tail through; lighter, it stalls at the edge
      path: [
        { t: 3.35, p: [0.05, R, -0.13] },
        { t: 3.6, p: [0.06, R, -0.04] },
        { t: 3.8, p: [0.06, R, 0.0] },
        { t: 4.05, p: [0.07, 0.05, 0.01] },
        { t: 4.3, p: [0.11, 0.05, 0.07] },
        { t: 4.6, p: [0.2, 0.04, 0.08] },
      ],
    },

    // Phase 3: pull both ends hard, so the knot cinches: thick stiff rope takes a couple of hundred newtons.
    // Targets sit where both tails come out evenly, so the knot (at x ≈ -0.06, more rope to its left) stays put.
    {
      at: 0,
      grab: 4.6,
      compliance: 0.001,
      force: 250,
      path: [{ t: 5.8, p: [-0.95, 0.04, 0] }, { t: 6.6 }],
    },
    {
      at: 1,
      grab: 4.6,
      compliance: 0.001,
      force: 250,
      path: [{ t: 5.8, p: [0.35, 0.04, 0] }, { t: 6.6 }],
    },
  ],
};
