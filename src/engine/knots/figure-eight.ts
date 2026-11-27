import type { KnotDef } from "./types";

// The rope lies along x from -0.9 (standing end) to 1.1 (working end); the camera looks from +z.
// On screen, +z is the near side (bottom of the reference photos) and -z is the far side (top).
// Guides are placed by `tip(m)`: m metres of rope back from the working end (x = 1.1 - m at the start).
// The knot is tied about 0.9 m from the tip, so the standing part runs off to the left.
// Layout: first an S (standing part, a U-turn at the right, a run back left on the far side, a bend,
// the tip heading right). The upper bend then swings over the standing part, which closes a small eye
// (centre (0.2, -0.06), radius 0.06) at the right, crossing the standing part at x = 0.15.
const R = 0.012;
const LENGTH = 2;
const tip = (m: number) => 1 - m / LENGTH;

export const figureEight: KnotDef = {
  id: "figure-eight",
  name: "Figure-eight knot",
  addedDate: "2026-10-30",
  summary:
    "A bulkier stopper than the overhand, and easier to untie. The extra turn is what makes the figure eight.",
  ropes: [
    {
      length: LENGTH,
      radius: R,
      start: [
        [-0.9, R, 0],
        [1.1, R, 0],
      ],
    },
  ],
  duration: 17.2,
  steps: [
    { t: 0, title: "Lay the rope out straight" },
    { t: 0.4, title: "Fold the working end back into an S" },
    { t: 3.9, title: "Bring the tip over the rope to make a small loop at the right" },
    { t: 7, title: "Pass the tip under the rope, up to the top beside the loop" },
    { t: 9.8, title: "Tuck the tip down through the loop" },
    { t: 13.2, title: "Pull both ends to tighten" },
    { t: 16.6, title: "Done: a figure-eight knot" },
  ],
  guides: [
    // Anchor and eye pins hold until the pull has taken over, or the standing part gets dragged.
    { at: tip(1.3), grab: 0.4, path: [{ t: 13.6 }] },

    // The eye, from its right side round to the crossing. In the S these are the U-turn and the middle run.
    {
      at: tip(0.805), // right side; lifted again at 9.6 to let the tip pass under it
      grab: 0.4,
      path: [
        { t: 1.4, p: [0.26, 0.03, -0.03] },
        { t: 2.4, p: [0.26, R, -0.04] },
        { t: 3.9 },
        { t: 4.6, p: [0.26, R, -0.06] },
        { t: 9.6 },
      ],
    },
    {
      at: tip(0.71), // far side
      grab: 0.6,
      path: [
        { t: 1.7, p: [0.2, 0.04, -0.1] },
        { t: 2.7, p: [0.2, R, -0.1] },
        { t: 3.9 },
        { t: 4.7, p: [0.2, R, -0.12] },
        { t: 13.6 },
      ],
    },
    {
      at: tip(0.615), // left side
      grab: 0.8,
      path: [
        { t: 2.0, p: [0.1, 0.04, -0.13] },
        { t: 3.0, p: [0.1, R, -0.13] },
        { t: 3.9 },
        { t: 4.9, p: [0.14, R, -0.06] },
        { t: 13.6 },
      ],
    },
    {
      at: tip(0.55), // the upper bend of the S, then the crossing: rests on the standing part
      grab: 1.0,
      path: [
        { t: 2.3, p: [0.03, 0.04, -0.17] },
        { t: 3.3, p: [0.03, R, -0.17] },
        { t: 3.9 },
        { t: 4.4, p: [0.1, 0.06, -0.08] },
        { t: 5.2, p: [0.15, 0.05, 0] },
        { t: 5.6, p: [0.15, 0.036, 0] },
        { t: 13.6 },
      ],
    },

    // The tail of the S. These pins lay it out; tip(0.46) lets go, and the rest flip the head over together.
    {
      at: tip(0.46),
      grab: 1.2,
      path: [{ t: 2.5, p: [0.02, 0.04, -0.23] }, { t: 3.5, p: [0.02, R, -0.23] }, { t: 3.9 }],
    },
    {
      at: tip(0.37), // the head of the S
      grab: 1.4,
      path: [
        { t: 2.7, p: [0.1, 0.04, -0.27] },
        { t: 3.6, p: [0.1, R, -0.27] },
        { t: 4.6, p: [0.1, 0.07, -0.17] },
        { t: 5.2, p: [0.09, 0.08, 0.03] },
        { t: 5.9, p: [0.1, R, 0.17] },
        { t: 7 }, // holds the top of the J while the end curls round
      ],
    },
    {
      at: tip(0.23), // keeps the tail beyond the head from flopping about, then lays the bottom of the J
      grab: 1.6,
      path: [
        { t: 2.9, p: [0.22, 0.04, -0.29] },
        { t: 3.7, p: [0.22, R, -0.29] },
        { t: 4.6, p: [0.22, 0.07, -0.18] },
        { t: 5.2, p: [0.22, 0.07, 0.05] },
        { t: 5.7, p: [0.22, 0.04, 0.2] },
        { t: 6.1, p: [0.1, R, 0.27] },
        { t: 6.6, p: [0, R, 0.27] },
        { t: 7 },
      ],
    },
    {
      at: 1,
      grab: 1.8, // last, so the rope folds from the eye outward and never swings through a big loop
      force: 35, // lifting the end and the rope trailing on the table; lighter, it lags and then whips
      path: [
        { t: 2.5, p: [0.6, 0.06, -0.15] },
        { t: 3.3, p: [0.49, 0.04, -0.29] },
        { t: 3.9, p: [0.48, R, -0.29] }, // tail lies straight from tip(0.23); nearer, its slack bows into a wave

        // The whole head of the S flips over like a page: the head, the middle of the tail and the end
        // move together, keeping their spacing. Then the end leads left along the near side and turns
        // up, ahead of the hand laying the bottom of the J, so the tip points at the standing part.
        { t: 4.6, p: [0.46, 0.07, -0.18] },
        { t: 5.2, p: [0.42, 0.07, 0.05] },
        { t: 5.75, p: [0.2, 0.04, 0.3] },
        { t: 6.1, p: [-0.05, R, 0.28] },
        { t: 6.6, p: [-0.08, R, 0.16] },
        { t: 7, p: [-0.07, R, 0.08] }, // short of the standing part; the tuck's hand takes it from here
      ],
    },

    // Lift the standing part at x = -0.03 and pass the tip under it, near side to far side.
    {
      at: tip(1.1),
      grab: 7.4,
      path: [{ t: 7.9, p: [-0.03, 0.07, 0] }, { t: 8.8 }, { t: 9.3, p: [-0.03, R, 0] }],
    },
    {
      at: 1,
      grab: 7, // from the near side, where the flip left it
      force: 50,
      path: [
        { t: 8, p: [-0.1, R, 0.07] },
        { t: 8.4, p: [-0.03, R, 0] },
        { t: 8.8, p: [-0.02, R, -0.13] },

        // Over the far side of the eye, down into it, then under the right side of the eye.
        { t: 9.8, p: [0.12, 0.07, -0.2] },
        { t: 10.4, p: [0.2, 0.07, -0.19] },
        { t: 10.9, p: [0.21, 0.04, -0.09] },
        { t: 11.4, p: [0.23, R, -0.07] },
        { t: 12, p: [0.3, R, -0.06] },
        { t: 12.6, p: [0.38, R, -0.05] },
      ],
    },
    {
      at: tip(0.805), // the right side of the eye lifts so the tip can slide under it
      grab: 9.6,
      path: [{ t: 10.2, p: [0.26, 0.07, -0.05] }, { t: 12.2 }, { t: 12.6, p: [0.26, R, -0.05] }],
    },

    // Pull both ends hard, so the knot cinches. Targets leave a short tail.
    {
      at: 0,
      grab: 13.2,
      compliance: 0.001,
      force: 250,
      path: [{ t: 14.4, p: [-1.09, R, 0] }, { t: 15.2 }, { t: 15.8, p: [-1.07, R, 0] }, { t: 16 }],
    },
    {
      at: 1,
      grab: 13.2,
      compliance: 0.001,
      force: 250,
      path: [{ t: 14.4, p: [0.56, R, 0] }, { t: 15.2 }, { t: 15.8, p: [0.54, R, 0] }, { t: 16 }],
    },

    // Pulled tight, the knot stands up on its edge. While the ends ease off (above), a hand rolls its
    // top toward the camera round the knot's own middle, so it lies flat and shows the 8 without
    // sliding off the rope's line.
    {
      at: 0.646,
      grab: 15.2,
      force: 40,
      path: [
        { t: 15.8, p: [0.21, 0.05, 0] },
        { t: 16.2, p: [0.21, 0.033, 0.012] },
        { t: 16.5, p: [0.21, 0.024, 0.02] },
        { t: 16.8 },
      ],
    },
  ],
};
