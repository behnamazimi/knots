import type { KnotDef } from "./types";

// A rail runs along x at z = 0, raised on two supports so rope can pass under it; the camera looks
// from +z, so the near side (+z) is the bottom of the screen. The standing part lies straight on the
// near side, from its end at z = 0.45 up to the rail at x = -0.06, and goes over it; the working end
// lies on the far side in a U opening to the right, its tip pointing at the rail. The top of the rail
// is at 0.449 along the rope.
const R = 0.012;
const RAIL = 0.016; // rail radius
const RAIL_Y = RAIL + 3 * R; // rail centre height: rope passes under it without being pinched on the table
const TOP = RAIL_Y + RAIL + R; // centre height of rope lying on the rail
const SPAN = 0.4; // the supports stand at x = ±SPAN

export const cloveHitch: KnotDef = {
  id: "clove-hitch",
  name: "Clove hitch – rope end",
  addedDate: "2026-10-31",
  summary:
    "Ties a rope to a rail or post quickly. Easy to adjust, but it can slip when the load turns the rail.",
  ropes: [
    {
      length: 1.079,
      radius: R,
      start: [
        [-0.06, R, 0.45],
        [-0.06, R, 0.05],
        [-0.06, 0.06, 0.02],
        [-0.06, TOP, 0],
        [-0.06, 0.06, -0.02],
        [-0.06, R, -0.05],
        [-0.03, R, -0.12],
        [0.05, R, -0.18],
        [0.13, R, -0.19],
        [0.18, R, -0.15],
        [0.15, R, -0.1],
        [0.08, R, -0.07],
        [0.03, R, -0.05],
      ],
    },
  ],
  props: [
    { kind: "cylinder", a: [-SPAN - 0.03, RAIL_Y, 0], b: [SPAN + 0.03, RAIL_Y, 0], radius: RAIL },
    { kind: "cylinder", a: [-SPAN, 0, 0], b: [-SPAN, RAIL_Y, 0], radius: RAIL },
    { kind: "cylinder", a: [SPAN, 0, 0], b: [SPAN, RAIL_Y, 0], radius: RAIL },
  ],
  duration: 9.2,
  steps: [
    { t: 0, title: "Lay the rope over the rail" },
    { t: 0.4, title: "Bring the end round and under the rail" },
    { t: 2.6, title: "Cross over the standing part" },
    { t: 4.0, title: "Round the rail again" },
    { t: 5.4, title: "Tuck the end under the crossing" },
    { t: 6.8, title: "Pull both ends to tighten" },
    { t: 8.4, title: "Done: a clove hitch" },
  ],
  guides: [
    // Holds the standing part just short of the rail while the end goes round.
    { at: 0.332, grab: 0.4, path: [{ t: 6.8 }] },

    // The end. The rope behind it falls into loose turns, as when tying by hand; the pull tightens them.
    {
      at: 1,
      grab: 0.4,
      force: 150,
      path: [
        // Tip first, straight under the rail to the near side, just right of the standing part.
        { t: 1.4, p: [-0.01, R + 0.002, -0.03] },
        { t: 2.1, p: [-0.02, R + 0.002, 0.06] },
        { t: 2.6, p: [-0.01, 0.03, 0.13] },

        // Up over the rail to the far left, crossing over the standing part on top.
        { t: 3.0, p: [-0.02, 0.06, 0.08] },
        { t: 3.4, p: [-0.06, TOP + 0.03, 0] },
        { t: 3.7, p: [-0.11, 0.07, -0.07] },
        { t: 4.0, p: [-0.15, 0.04, -0.12] },

        // Down behind and under the rail again, left of the standing part.
        { t: 4.4, p: [-0.12, R + 0.002, -0.05] },
        { t: 4.7, p: [-0.12, R + 0.002, 0.06] },
        { t: 5.0, p: [-0.14, 0.03, 0.13] },

        // Up through the middle, under the crossing, and out to the far side. It runs on the rail
        // left of the standing part (x ≈ -0.06), not on top of it.
        { t: 5.4, p: [-0.11, 0.06, 0.08] },
        { t: 5.9, p: [-0.09, TOP + 0.003, -0.005] },
        { t: 6.3, p: [-0.09, 0.07, -0.08] },
        { t: 6.8, p: [-0.09, 0.04, -0.16] },
      ],
    },

    // Lifts the crossing off the rail so the end can go under it, then lays it back down.
    {
      at: 0.701,
      grab: 5.2,
      path: [
        { t: 5.6, p: [-0.085, TOP + 0.05, -0.01] },
        { t: 6.2 },
        { t: 6.6, p: [-0.085, TOP, -0.01] },
      ],
    },

    // Two fingers slide the turns along the rail towards each other, under it where they lie, and hold
    // them there while the ends are pulled, so the hitch closes up instead of staying as wide as it was laid.
    {
      at: 0.538,
      grab: 6.8,
      compliance: 0.001,
      force: 120,
      path: [{ t: 7.3, p: [-0.067, 2.2 * R, -0.012] }, { t: 8.4 }],
    },
    {
      at: 0.782,
      grab: 6.8,
      compliance: 0.001,
      force: 120,
      path: [{ t: 7.3, p: [-0.123, 2.2 * R, -0.008] }, { t: 8.4 }],
    },

    // Pull the end away to the far side and the standing part to the near side. Each leaves the
    // knot beside the other's turn and is pulled across towards it, so the turns close up along the rail.
    {
      at: 1,
      grab: 7.2,
      compliance: 0.001,
      force: 150,
      path: [{ t: 8.0, p: [0.0, R, -0.3] }, { t: 8.4 }],
    },
    {
      at: 0,
      grab: 7.2,
      compliance: 0.001,
      force: 200,
      path: [{ t: 8.0, p: [-0.12, R, 0.66] }, { t: 8.4 }],
    },
  ],
};
