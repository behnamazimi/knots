import type { Guide, KnotDef } from "./types";

// The rope lies along x from -0.55 (left end) to 2.95 (working end); the camera looks from +z.
// Points are named by their distance from the left end, `A(s)`, so a point starts at x = s - 0.55.
// The left tail stays where it is and no hand touches the working end until the lock: every link
// is a bight of the long part pulled up through the last loop, so the long part slides in as the
// chain uses it up.
const R = 0.012;
const L = 3.5; // long: the noose and every link use up rope, and the end must still reach back for the lock
const A = (s: number) => s / L;
const Z = 0.04; // the rope lies a little toward the camera, to leave room for loops behind it

/**
 * One link, starting at time `t`: two hands open the last loop (its end at x, `tip` metres from the
 * left end) by its sides, and one hand pulls a bight of the long part (`next` metres from the left
 * end) under it, up through it and lays it on along the rope, then holds it up as the next loop.
 */
function link(
  t: number,
  x: number,
  tip: number,
  next: number,
  side = 0.06,
  back = 0.05,
  reach = 0.12,
  release = t + 6.4, // the new loop is held up until the next link (or the lock) has gone through it
): Guide[] {
  const open = (side: number, dz: number): Guide => ({
    at: A(tip + side),
    grab: t,
    force: 300,
    path: [{ t: t + 0.5, p: [x - back, 0.05, Z + dz] }, { t: t + 3.0 }],
  });
  return [
    open(-side, -0.04),
    open(side, 0.04),
    {
      // Moved slowly: the long part slides in behind it, and a fast pull whips it.
      at: A(next),
      grab: t + 0.5,
      force: 150,
      path: [
        { t: t + 1.3, p: [x - back, R, Z + 0.09] },
        { t: t + 1.7, p: [x - back, R, Z] },
        { t: t + 2.1, p: [x - back, 0.09, Z] },
        { t: t + 2.7, p: [x + reach * 0.7, 0.04, Z] },
        { t: t + 3.0, p: [x + reach, R, Z] },
        { t: t + 3.5, p: [x + reach, 0.03, Z] },
        { t: release },
        { t: release + 0.4, p: [x + reach, R, Z] },
      ],
    },
  ];
}

export const daisyChain: KnotDef = {
  id: "daisy-chain",
  name: "Daisy chain",
  summary:
    "A chain of loops, each pulled through the last. Shortens a long rope for storage and comes undone with one pull once the end is freed.",
  ropes: [
    {
      length: L,
      radius: R,
      start: [
        [-0.55, R, Z],
        [L - 0.55, R, Z],
      ],
    },
  ],
  duration: 32,
  steps: [
    { t: 0, title: "Lay the rope out straight" },
    { t: 0.4, title: "Make a loop" },
    {
      t: 3.9,
      title: "Lay a bight of the long part over the loop and tuck it out under the far side",
    },
    { t: 5.6, title: "Pull the short end to close the noose" },
    { t: 6.8, title: "Turn the bight to point along the rope" },
    { t: 8.4, title: "Pull a bight of the long part up through the loop" },
    { t: 12.1, title: "Repeat: pull the next bight up through the newest loop" },
    { t: 26.6, title: "Pass the end through the last loop to lock the chain" },
    { t: 30.6, title: "Done: a daisy chain. Free the end and pull it to undo the chain" },
  ],
  guides: [
    // Hold the rope where the loop will cross, and lift it a little so the other side can pass under.
    {
      at: A(0.399),
      grab: 0.4,
      path: [
        { t: 1.4 },
        { t: 1.8, p: [-0.15, 0.045, Z] },
        { t: 3.4 },
        { t: 3.7, p: [-0.15, R, Z] },
      ],
    },
    // Pull the middle of the loop back into a U; the long part slides in to feed it.
    { at: A(0.601), grab: 0.4, path: [{ t: 1.4, p: [-0.1, R, -0.07] }, { t: 3.7 }] },
    // Carry the right side of the U left, under the lifted rope, to close the loop.
    {
      at: A(0.811),
      grab: 1.4,
      force: 120,
      path: [
        { t: 2.0, p: [0.0, R, Z + 0.01] },
        { t: 2.7, p: [-0.14, R, Z + 0.01] },
        { t: 3.0, p: [-0.2, R, Z + 0.01] },
        { t: 3.7 },
      ],
    },

    // The noose: lay a bight of the long part over the near side of the loop and tuck it out under
    // the far side, which one hand lifts.
    {
      at: A(0.63),
      grab: 4.3,
      path: [{ t: 4.7, p: [-0.13, 0.07, -0.08] }, { t: 5.3 }, { t: 5.6, p: [-0.13, R, -0.07] }],
    },
    {
      at: A(1.071),
      grab: 3.9,
      force: 150,
      path: [
        { t: 4.4, p: [-0.12, 0.04, 0.07] },
        { t: 4.8, p: [-0.13, R, -0.01] },
        { t: 5.2, p: [-0.13, R, -0.11] },
        { t: 5.6, p: [-0.06, R, -0.11] },
        { t: 6.8 },
        { t: 7.5, p: [0.0, R, -0.05] },
        { t: 8.1, p: [-0.03, R, Z] },
        { t: 8.9, p: [-0.02, 0.03, Z] },
        { t: 11.1 },
        { t: 11.5, p: [-0.02, R, Z] },
        { t: 11.6 },
      ],
    },
    // Close the noose: pull the short end while the bight stays put; the long part feeds the bight.
    {
      at: A(0.273),
      grab: 3.9,
      force: 400,
      compliance: 0.001,
      path: [{ t: 5.6 }, { t: 6.8, p: [-0.45, R, Z] }, { t: 7.0 }],
    },
    // Hold the short end while the chain is made, or each pull drags the knot along.
    { at: A(0.273), grab: 7.0, force: 400, path: [{ t: 31 }] },

    ...link(8.4, -0.02, 1.071, 1.43, 0.063, 0.06),
    ...link(12.1, 0.09, 1.43, 1.79),
    ...link(15.8, 0.19, 1.79, 2.15),
    ...link(19.5, 0.26, 2.15, 2.57, 0.06, 0.05, 0.16),
    ...link(23.2, 0.4, 2.57, 2.99, 0.06, 0.05, 0.16, 28.7),

    // The lock: open the last loop and pass the end itself through it, as the links did a bight.
    // Once the end is up through, every hand on the loop lets go and the end is drawn right through.
    {
      at: A(2.99 - 0.06),
      grab: 26.6,
      force: 300,
      path: [
        { t: 27.1, p: [0.36, 0.05, Z - 0.04] },
        { t: 28.6 },
        { t: 29.0, p: [0.36, R, Z - 0.03] },
      ],
    },
    {
      at: A(2.99 + 0.06),
      grab: 26.6,
      force: 300,
      path: [
        { t: 27.1, p: [0.36, 0.05, Z + 0.04] },
        { t: 28.6 },
        { t: 29.0, p: [0.36, R, Z + 0.03] },
      ],
    },
    {
      at: 1,
      grab: 25.8,
      force: 150,
      path: [
        { t: 27.3, p: [0.5, R, Z + 0.1] },
        { t: 27.8, p: [0.37, R, Z + 0.09] },
        { t: 28.2, p: [0.36, R, Z] },
        { t: 28.6, p: [0.36, 0.09, Z] },
        { t: 29.2, p: [0.46, 0.04, Z] },
        { t: 30.4, p: [0.75, R, Z] },
        { t: 30.6 },
      ],
    },
  ],
};
