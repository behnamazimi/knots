import type { KnotDef } from "./types";

// The rope lies along x from -0.6 (standing end) to 0.9 (working end); the camera looks from +z.
// `at` is the fraction along the rope, so a point starts at x = at * 1.5 - 0.6.
// Tied like the overhand, but the tuck is a bight of the tail, not its tip. The bight needs about
// 0.45 m of tail; the tail is no longer than the straight line from the crossing to where the end
// lays it, so the rope is longer than the overhand's and the tail goes down and left, in view.
const R = 0.012;

export const slipKnot: KnotDef = {
  id: "slip-knot",
  name: "Slip knot",
  summary:
    "An overhand knot tied with a bight of the short end. A temporary stopper: one pull on the short end undoes it.",
  ropes: [
    {
      length: 1.5,
      radius: R,
      start: [
        [-0.6, R, 0],
        [0.9, R, 0],
      ],
    },
  ],
  duration: 9.1,
  steps: [
    { t: 0, title: "Lay the rope out straight" },
    { t: 0.4, title: "Make a loop: bring the short end over the standing part" },
    { t: 3.75, title: "Fold a bight in the short end and push it under the loop" },
    { t: 4.8, title: "Bring the bight up through the loop" },
    { t: 5.9, title: "Pull the bight and the standing part to tighten" },
    { t: 8.1, title: "Done: a slip knot. Pull the short end to undo it" },
  ],
  guides: [
    // Phase 1: one hand carries the end round the far side and over the rope towards the camera, then
    // lays the tail out down and to the left; the loop gives up rope as it goes.
    { at: 0.4, grab: 0.4, path: [{ t: 6.3 }] },
    {
      at: 1,
      grab: 0.4,
      force: 45,
      path: [
        { t: 1.0, p: [0.4, R, -0.1] },
        { t: 1.55, p: [0.12, R, -0.14] },
        { t: 2.0, p: [-0.03, R, -0.14] },
        { t: 2.25, p: [-0.09, R, -0.09] },
        { t: 2.5, p: [-0.09, 0.045, -0.02] },
        { t: 2.75, p: [-0.1, 0.03, 0.09] },
        { t: 3.05, p: [-0.2, 0.03, 0.15] },
        { t: 3.4, p: [-0.32, R, 0.19] },
        { t: 3.75, p: [-0.45, R, 0.21] },
      ],
    },

    // Phase 2: lift the near side of the loop; one hand pinches the tail about halfway along and
    // pushes it, doubled, under that side, up through the middle and out over the far side. The tip
    // stays outside.
    {
      at: 0.5,
      grab: 4.4,
      force: 45, // lighter, the bight carries this side along with it
      path: [{ t: 4.7, p: [0.13, 0.05, 0.07] }, { t: 5.6 }, { t: 5.9, p: [0.13, 0.03, 0.06] }],
    },
    {
      at: 0.84,
      grab: 3.75,
      force: 45,
      path: [
        { t: 4.5, p: [0.1, R, 0.14] },
        { t: 4.8, p: [0.12, R, 0.07] },
        { t: 5.05, p: [0.12, R, 0.02] },
        { t: 5.35, p: [0.12, 0.05, 0.0] },
        { t: 5.6, p: [0.15, 0.05, -0.05] },
        { t: 5.9, p: [0.21, 0.04, -0.07] },
      ],
    },

    // Phase 3: pull the standing end and the bight apart. The other hand holds the tail's tip, or
    // the pull draws it through the loop too and the knot falls apart.
    { at: 1, grab: 5.9, path: [{ t: 7.9 }] },
    {
      at: 0,
      grab: 5.9,
      compliance: 0.001,
      force: 250,
      path: [{ t: 7.1, p: [-0.8, 0.04, 0] }, { t: 7.9 }],
    },
    {
      at: 0.84,
      grab: 5.9,
      compliance: 0.001,
      force: 250,
      path: [{ t: 7.1, p: [0.4, 0.04, 0] }, { t: 7.9 }],
    },
  ],
};
