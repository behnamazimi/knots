import type { KnotDef } from "./types";

// The rope lies along x from -0.55 (standing end) to 1.25 (working end); the camera looks from +z.
// On screen, +z is the near side and -z the far side. A point starts at x = at * 1.8 - 0.55.
// Layout (top view): the small loop (lobe, radius 0.06) is centred at (-0.01, 0), so the knot sits mid-scene; the standing part
// comes in from the left and the eye side crosses over it at (-0.08, 0). The eye lies to the right,
// its near leg at z = 0.09, and the tail goes up through the lobe, round the standing part at x = -0.14
// and back down through the lobe.
const R = 0.012;
const LENGTH = 1.8;
const LIFT = 0.06; // a strand held up so the end can pass under it

export const bowline: KnotDef = {
  id: "bowline",
  name: "Bowline",
  summary:
    "A fixed loop at the end of a rope that will not slip or jam, and unties easily after a load.",
  ropes: [
    {
      length: LENGTH,
      radius: R,
      start: [
        [-0.55, R, 0],
        [1.25, R, 0],
      ],
    },
  ],
  duration: 18,
  steps: [
    { t: 0, title: "Lay the rope out straight" },
    { t: 0.4, title: "Make a small loop, with the working side on top" },
    { t: 3.4, title: "Swing the end round to form the eye" },
    { t: 7, title: "Bring the end up through the small loop from underneath" },
    { t: 9.6, title: "Take it round behind the standing part" },
    { t: 11.9, title: "Go back down through the small loop" },
    { t: 14.5, title: "Hold the tail against the eye and pull the standing part" },
    { t: 17.4, title: "Done: a bowline" },
  ],
  guides: [
    // Holds the standing part down; once the end is round it, pulling the end would swing it about.
    { at: 0.06, grab: 0.4, path: [{ t: 14.9 }] },

    // The small loop. These hold it in place until the pull has taken over.
    {
      at: 0.175, // standing side of the crossing
      grab: 0.4,
      path: [{ t: 1.4, p: [-0.067, R, 0.01] }, { t: 14.9 }],
    },
    {
      at: 0.22, // near side of the loop
      grab: 0.6,
      path: [{ t: 1.6, p: [-0.01, 0.03, 0.06] }, { t: 2.2, p: [-0.01, R, 0.06] }, { t: 3.4 }],
    },
    {
      at: 0.272, // right of the loop, where the end passes under it: lifted for the way up and the way down
      grab: 0.8,
      path: [
        { t: 1.8, p: [0.05, 0.03, 0] },
        { t: 2.4, p: [0.05, R, 0] },
        { t: 7.2 },
        { t: 7.6, p: [0.05, LIFT, 0] },
        { t: 8.5 }, // the end is under it and in the hole
        { t: 8.9, p: [0.05, R, 0] },
        { t: 13.2 },
        { t: 13.6, p: [0.05, LIFT, 0] },
        { t: 14.1 },
        { t: 14.4, p: [0.05, R, 0] },
        { t: 14.9 },
      ],
    },
    {
      at: 0.324, // far side of the loop
      grab: 1.0,
      path: [{ t: 2.0, p: [0, 0.03, -0.06] }, { t: 2.6, p: [-0.012, R, -0.06] }, { t: 3.4 }],
    },
    {
      at: 0.379, // the hand: lays the eye side over the standing part
      grab: 1.2,
      path: [
        { t: 2.0, p: [0.05, 0.05, -0.1] },
        { t: 2.6, p: [-0.07, 0.06, -0.03] },
        { t: 3.0, p: [-0.082, 3 * R, 0] },
        { t: 14.9 },
      ],
    },
    {
      at: 0.446, // start of the eye, beside the near side of the loop
      grab: 1.4,
      path: [{ t: 2.4, p: [0.1, 0.03, 0.13] }, { t: 3.1, p: [-0.036, R, 0.095] }, { t: 6.6 }],
    },

    // The eye: the end swings round on the far side, and its fold is laid out to the right.
    {
      at: 0.732,
      grab: 4.0,
      path: [{ t: 5.4, p: [0.45, R, 0.02] }, { t: 6.6 }],
    },
    {
      at: 1,
      grab: 3.4,
      force: 35, // lifting the end and the rope trailing on the table; lighter, it lags and then whips
      path: [
        { t: 4.2, p: [0.8, 0.05, -0.1] },
        { t: 5.0, p: [0.5, 0.05, -0.17] },
        { t: 5.8, p: [0.2, 0.04, -0.11] },
        { t: 6.4, p: [0.09, R, -0.04] },

        // Up through the loop: in under its lifted right side along the table to the middle of the
        // hole (loop centre about (-0.02, 0)), up out of it, then over its far side by the crossing.
        { t: 7.7, p: [0.1, R, -0.01] },
        { t: 8.1, p: [0.05, R, -0.01] },
        { t: 8.5, p: [-0.015, R, 0] },
        { t: 8.9, p: [-0.03, 0.05, -0.02] },
        { t: 9.2, p: [-0.07, 0.045, -0.045] },
        { t: 9.6, p: [-0.22, R, -0.13] }, // draw plenty of tail through, or it springs back out

        // Round behind the standing part, far side to near side.
        { t: 10.1, p: [-0.16, R, -0.05] },
        { t: 10.5, p: [-0.15, R, 0] },
        { t: 10.9, p: [-0.16, R, 0.06] },
        { t: 11.3, p: [-0.21, R, 0.17] },
        { t: 11.9, p: [-0.27, R, 0.32] }, // enough tail past the standing part to go back through

        // Back down through the loop: over the crossing strands, straight down into the hole beside the
        // strand that came up (the loaded loop shrinks to about (-0.01, -0.01), radius 0.045, so aim
        // at its middle, not its rim), then under the lifted right side.
        { t: 12.5, p: [-0.17, 0.045, 0.15] },
        { t: 12.9, p: [-0.1, 0.05, 0.06] },
        { t: 13.3, p: [-0.03, 0.065, 0] },
        { t: 13.6, p: [0.01, 0.035, -0.005] },
        { t: 13.9, p: [0.02, R, -0.005] },
        { t: 14.2, p: [0.08, R, 0] },
        { t: 14.5, p: [0.27, R, 0.0] }, // well into the eye, so a good tail is left
        { t: 14.8 }, // hold until the pull takes the end
      ],
    },
    {
      at: 0.135, // the standing part lifts so the end can pass under it
      grab: 9.6,
      path: [{ t: 10.0, p: [-0.15, LIFT, 0] }, { t: 11.8 }, { t: 12.1, p: [-0.15, R, 0] }],
    },

    // Pull the standing part against the eye and the tail. Both sides of the eye are held apart on the
    // table, so the knot cannot roll onto its side; one pull at the far end of the eye twisted it up.
    // Then each hand eases back to where its rope is before letting go: dropped at full pull, the
    // stiff rope springs the knot open.
    {
      at: 0,
      grab: 14.5,
      compliance: 0.001,
      force: 150,
      path: [{ t: 15.9, p: [-0.8, R, 0] }, { t: 16.3 }, { t: 16.8, p: [-0.48, R, 0] }, { t: 17.2 }],
    },
    {
      at: 0.54, // near side of the eye
      grab: 14.5,
      compliance: 0.001,
      force: 55,
      path: [
        { t: 15.9, p: [0.45, R, 0.06] },
        { t: 16.3 },
        { t: 16.8, p: [0.27, R, 0.05] },
        { t: 17.2 },
      ],
    },
    {
      at: 0.656, // far side of the eye
      grab: 14.5,
      compliance: 0.001,
      force: 55,
      path: [
        { t: 15.9, p: [0.45, R, -0.06] },
        { t: 16.3 },
        { t: 16.8, p: [0.25, R, -0.05] },
        { t: 17.2 },
      ],
    },
    {
      at: 1,
      grab: 14.5,
      compliance: 0.001,
      force: 40,
      path: [{ t: 15.9, p: [0.41, R, 0] }, { t: 16.3 }, { t: 16.8, p: [0.2, R, 0] }, { t: 17.2 }],
    },
  ],
};
