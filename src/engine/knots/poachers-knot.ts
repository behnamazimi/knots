import type { Guide, KnotDef, Vec3 } from "./types";

// The poacher's knot (double overhand noose); the camera looks from +z, so +z is the bottom of the screen.
// The rope starts as a bight: the standing part (S) runs along z = SZ from S0 to the bight's tip
// and comes back along the far side (T) to CORNER. There the end crosses over S to the near side
// and lies out along the near side.
const R = 0.012;
const SZ = 0.03; // the strands lie 2 * SZ apart
const S0 = -0.589; // x of the standing end
const APEX = 0.27; // x where the bight starts to turn
const TIP = 0.295; // x of the bight's tip
const CORNER = 0.03;
const UP = 0.045; // height a strand is lifted to
const LENGTH = 1.847;
const T0 = 0.92; // distance along the rope to the bight's tip
// The start pose: a bight with the end laid over S, as the rope settles into it (taken from a bake,
// every fourth particle), so nothing moves at the start.
const start: Vec3[] = [
  [-0.5893, 0.012, 0.03],
  [-0.551, 0.012, 0.03],
  [-0.5128, 0.012, 0.03],
  [-0.4745, 0.012, 0.03],
  [-0.4362, 0.012, 0.03],
  [-0.3979, 0.012, 0.03],
  [-0.3596, 0.012, 0.03],
  [-0.3214, 0.012, 0.03],
  [-0.2831, 0.012, 0.03],
  [-0.2448, 0.012, 0.03],
  [-0.2065, 0.012, 0.03],
  [-0.1682, 0.012, 0.0299],
  [-0.13, 0.012, 0.0294],
  [-0.0917, 0.012, 0.0288],
  [-0.0534, 0.012, 0.0287],
  [-0.0152, 0.012, 0.03],
  [0.0229, 0.012, 0.0337],
  [0.0608, 0.012, 0.0396],
  [0.0983, 0.012, 0.0471],
  [0.1358, 0.012, 0.0547],
  [0.1738, 0.012, 0.0596],
  [0.2119, 0.012, 0.0579],
  [0.2479, 0.012, 0.0453],
  [0.2753, 0.012, 0.0191],
  [0.2856, 0.012, -0.0172],
  [0.2743, 0.012, -0.0533],
  [0.2462, 0.012, -0.0787],
  [0.2098, 0.012, -0.0901],
  [0.1716, 0.012, -0.0897],
  [0.1343, 0.012, -0.0814],
  [0.0989, 0.0131, -0.0672],
  [0.0663, 0.0175, -0.0476],
  [0.0378, 0.025, -0.0233],
  [0.0139, 0.0326, 0.0056],
  [-0.0048, 0.035, 0.0387],
  [-0.017, 0.0291, 0.0744],
  [-0.0216, 0.021, 0.1115],
  [-0.0177, 0.0148, 0.149],
  [-0.0054, 0.0122, 0.185],
  [0.0149, 0.012, 0.2174],
  [0.0419, 0.012, 0.2445],
  [0.0739, 0.012, 0.2653],
  [0.1094, 0.012, 0.2796],
  [0.1467, 0.012, 0.288],
  [0.1848, 0.012, 0.2918],
  [0.223, 0.012, 0.2925],
  [0.2613, 0.012, 0.2917],
  [0.2996, 0.012, 0.2906],
  [0.3378, 0.012, 0.2896],
  [0.3474, 0.012, 0.2893],
];
// Fraction along the rope of a point of S, or of T, at x in the start pose (near enough: both run
// almost along x).
const onS = (x: number) => (x - S0) / LENGTH;
const onT = (x: number) => (T0 + TIP - x) / LENGTH;

// A hand lifting the rope at `at` to (x, UP, z) from `up` to `hold`, laying it down by `down`.
const lift = (at: number, x: number, z: number, grab: number, times: number[]): Guide => ({
  at,
  grab,
  path: [{ t: times[0], p: [x, UP, z] }, { t: times[1] }, { t: times[2], p: [x, R, z] }],
});

const W1 = CORNER + 0.03; // x where the end passes under both strands: close to the turn over S, so the wrap is tight

export const poachersKnot: KnotDef = {
  id: "poachers-knot",
  name: "Poacher's knot",
  addedDate: "2026-11-02",
  summary:
    "A double overhand noose: a loop that slides shut under load and grips hard. Good for snares and lashing.",
  ropes: [{ length: LENGTH, radius: R, start }],
  duration: 11.94,
  steps: [
    { t: 0, title: "Make a bight and lay the end over the standing part" },
    { t: 0.3, title: "Bring the end under both strands and pull it snug" },
    { t: 3.37, title: "Wrap again beside it: over both strands, then under both" },
    { t: 8.02, title: "Push the wraps together, then tuck the end back through both to the left" },
    { t: 10.32, title: "Pull the bight one way and both ends the other to tighten" },
    { t: 11.23, title: "Done: a poacher's knot" },
  ],
  guides: [
    { at: onS(-0.45), grab: 0.2, force: 250, path: [{ t: 10.32 }] },
    { at: onS(APEX - 0.08), grab: 0.2, force: 250, path: [{ t: 10.32 }] },
    { at: onT(APEX - 0.08), grab: 0.2, force: 250, path: [{ t: 10.32 }] },
    // Lift both strands where the end passes under them.
    lift(onS(W1), W1, SZ, 0.74, [1.47, 2.11, 2.32]),
    lift(onT(W1), W1, -SZ, 0.74, [1.47, 2.11, 2.32]),
    // Lifted again while the second wrap pulls the first one's ring through under them.
    lift(onS(W1 - 0.01), W1 - 0.01, SZ, 4.84, [5.33, 5.89, 5.98]),
    lift(onT(W1 + 0.01), W1 + 0.01, -SZ, 4.84, [5.33, 5.89, 5.98]),
    // The second wrap's under-pass: the wraps have drawn S and T apart here, so lift them where they lie.
    {
      at: onS(W1 + 0.08),
      grab: 5.98,
      path: [
        { t: 6.76, p: [W1 + 0.08, 0.08, 0.05] },
        { t: 7.9 },
        { t: 7.97, p: [W1 + 0.08, R, 0.05] },
      ],
    },
    {
      at: onT(W1 + 0.08),
      grab: 7.3,
      force: 250,
      path: [{ t: 7.5, p: [W1 + 0.08, 0.1, -0.07] }, { t: 7.7 }],
    },
    {
      at: 1,
      grab: 0.3,
      force: 45,
      path: [
        { t: 1.19, p: [W1 + 0.06, R, 0.2] },
        { t: 1.6, p: [W1 + 0.01, R, 0.09] },
        { t: 1.91, p: [W1, R, 0.0] },
        { t: 2.3, p: [W1, R, -0.12] },
      ],
    },
    // Holds T just past the wrap, so pulling tightens the wrap instead of drawing T's turn out from under S.
    { at: onT(W1 + 0.04), grab: 2.3, force: 250, path: [{ t: 7.75 }] },
    // The end pulls well away, drawing the first wrap's slack through under both strands so nothing
    // is left loose below the bight.
    {
      at: 1,
      grab: 2.3,
      compliance: 0.001,
      force: 250,
      path: [
        { t: 2.92, p: [W1 + 0.02, R, -0.3] },
        { t: 3.34, p: [W1 + 0.03, R, -0.42] },
        { t: 3.37 },
      ],
    },
    // Second wrap: back over both strands right beside the first.
    {
      at: 1,
      grab: 3.37,
      force: 45,
      path: [
        { t: 4.46, p: [W1 + 0.04, 0.05, -0.08] },
        { t: 5, p: [W1 + 0.04, 0.05, 0.06] },
        { t: 5.28, p: [W1 + 0.05, R, 0.14] },
      ],
    },
    // Pulling down draws the first wrap's ring snug round the strands; T is held right of the wraps so
    // its turn stays under them.
    { at: onT(W1 + 0.14), grab: 5.23, force: 250, path: [{ t: 5.92 }] },
    {
      at: 1,
      grab: 5.28,
      compliance: 0.001,
      force: 250,
      path: [{ t: 5.89, p: [W1 + 0.05, R, 0.32] }, { t: 5.92 }],
    },
    // Then back under both, pulled only gently: the wraps keep room for the end to come back through.
    {
      at: 1,
      grab: 5.92,
      force: 45,
      path: [
        { t: 6.64, p: [W1 + 0.08, R, 0.12] },
        { t: 6.84, p: [W1 + 0.08, R, 0.06] },
        { t: 7.03, p: [W1 + 0.08, R, 0.0] },
        { t: 7.75, p: [W1 + 0.08, R, -0.16] },
        { t: 7.95, p: [W1 + 0.1, R, -0.24] },
        { t: 8.02 },
      ],
    },
    // Before the tuck, the two wraps are pushed together sideways so they sit side by side with no gap,
    // and their tops are lifted. The first one is held from the second wrap on, so it doesn't fall right.
    {
      at: 0.69,
      grab: 5.23,
      force: 60, // firm, or the end pushes the top down as it passes under
      path: [
        { t: 5.33, p: [-0.01, 4.5 * R, 0.01] },
        { t: 8.02 },
        { t: 8.24, p: [0.0, 0.1, 0.02] },
        { t: 9.46 },
        // Pulled up a little more while the end passes through, so it stays put and leaves room.
        { t: 9.56, p: [0.0, 0.13, 0.02] },
        { t: 10.12 },
      ],
    },
    // Through the pull a softer hand keeps it together with the second wrap; a firm one fights the
    // bight's pull and stretches the rope.
    {
      at: 0.69,
      grab: 10.12,
      force: 25,
      path: [
        // Kept together through the pull and to the end, eased down onto the knot: let go, the first one
        // is loose enough to slide away from the second.
        { t: 10.32, p: [0.0, 6.5 * R, 0.02] },
        { t: 11.11, p: [0.01, 6 * R, 0.02] },
        { t: 11.65 },
      ],
    },
    {
      at: 0.84,
      grab: 8.02,
      path: [
        { t: 8.24, p: [0.03, 0.1, 0.0] },
        { t: 10.12 },
        { t: 10.32, p: [0.03, 6.5 * R, 0.0] },
        { t: 11.11, p: [0.035, 6 * R, 0.0] },
        { t: 11.65 },
      ],
    },
    // Tuck: in over T beside the second wrap, then left through both wraps over S, under their tops,
    // and out beside the standing part.
    {
      at: 1,
      grab: 8.02,
      force: 120,
      path: [
        { t: 8.24 },
        { t: 8.74, p: [0.21, 0.05, -0.08] },
        { t: 9.01, p: [0.2, 3 * R, 0] },
        // Through the middle of both wraps: above S, below their lifted tops.
        { t: 9.35, p: [0.1, 5 * R, 0] },
        { t: 9.52, p: [0.04, 5 * R, 0] },
        { t: 9.74, p: [-0.04, 5 * R, 0] },
        // Out on the left, slowly and only as far as it goes freely: a target far ahead of the end yanks
        // it once it comes free. The final pull draws the tail out.
        { t: 9.92, p: [-0.07, 4 * R, 0] },
        { t: 10.07, p: [-0.09, 3 * R, 0] },
        { t: 10.23, p: [-0.11, 2 * R, -0.01] },
        { t: 10.32 },
      ],
    },
    // Pull tight, slowly, with the wraps still held together: the bight's tip to the right, against the
    // end and the standing end to the left with as much force between them; the end pulls harder.
    {
      at: T0 / LENGTH, // the bight's tip
      grab: 10.32,
      force: 64,
      path: [{ t: 11.11, p: [APEX + SZ + 0.1, R, 0] }, { t: 11.65 }],
    },
    {
      at: 1,
      grab: 10.32, // takes the end from the tuck
      force: 48,
      path: [{ t: 11.11, p: [-0.32, R, -0.03] }, { t: 11.65 }],
    },
    {
      at: 0,
      grab: 10.32,
      force: 16,
      path: [{ t: 11.11, p: [S0 - 0.1, R, SZ] }, { t: 11.65 }],
    },
  ],
};
