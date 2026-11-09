/** What a visitor reads about a knot beyond its tying: the job it does, where it is used, its catch. */
export type KnotInfo = {
  job: JobId;
  type: string;
  /** One line for the card. */
  line: string;
  uses: string[];
  watch: string;
  /** Ids of other knots. */
  related: string[];
};

export const JOBS = [
  ["all", "All"],
  ["stop", "Stop a rope slipping"],
  ["loop", "Make a loop"],
  ["post", "Tie to a post"],
  ["join", "Join two ropes"],
  ["tidy", "Tidy a rope"],
] as const;
export type JobId = Exclude<(typeof JOBS)[number][0], "all">;

export const KNOT_INFO: Record<string, KnotInfo> = {
  overhand: {
    job: "stop",
    type: "Stopper",
    line: "Stops a rope slipping through a hole or a ring.",
    uses: [
      "Keep the end of a rope from running through a hole, ring or pulley.",
      "Weigh down or thicken the end of a rope so it is easier to hold.",
      "The first step of many other knots.",
    ],
    watch:
      "It can jam tight after a hard pull. If you will need to untie it later, use a figure-eight instead.",
    related: ["figure-eight", "slip-knot"],
  },
  "slip-knot": {
    job: "stop",
    type: "Stopper, temporary",
    line: "A temporary stopper that comes undone with one pull.",
    uses: [
      "Hold a rope in place for a moment while you work.",
      "Close a bag or a bundle you want to open with a single tug.",
      "Start a knitting or crochet row, or a quick adjustable loop.",
    ],
    watch: "Use it only for light, short jobs. It lets go as soon as the short end is pulled.",
    related: ["overhand", "poachers-knot"],
  },
  "figure-eight": {
    job: "stop",
    type: "Stopper",
    line: "A bulky stopper that stays easy to untie.",
    uses: [
      "Stop a rope running out through a ring, pulley or belay device.",
      "Mark the end of a climbing or sailing rope.",
      "Tie an end you will need to untie after it has been loaded.",
    ],
    watch: "It takes a little more rope and a few more steps than the overhand knot.",
    related: ["overhand", "bowline"],
  },
  bowline: {
    job: "loop",
    type: "Fixed loop",
    line: "A fixed loop that will not slip or jam.",
    uses: [
      "Make a loop around a post, tree or ring.",
      "Moor a boat to a ring or post.",
      "Hang a load from a fixed eye, or make a hauling loop at the end of a rope.",
    ],
    watch:
      "On slack rope that is shaken or flexed it can work loose. Leave a long tail, and add a stopper knot when it matters.",
    related: ["clove-hitch", "figure-eight"],
  },
  "clove-hitch": {
    job: "post",
    type: "Hitch",
    line: "Ties a rope to a post or rail in seconds.",
    uses: [
      "Tie a line to a rail, post or pole.",
      "Hang boat fenders or a tarp from a rail.",
      "Start and finish a lashing.",
    ],
    watch:
      "It is easy to adjust, but it can slip when the load turns the rail. Back it up with a half hitch when it matters.",
    related: ["bowline", "poachers-knot"],
  },
  zeppelin: {
    job: "join",
    type: "Bend",
    line: "Joins two ropes securely and unties easily.",
    uses: [
      "Join two ropes that will carry a heavy load.",
      "Make a short rope longer.",
      "Tie a join you will need to take apart again afterwards.",
    ],
    watch: "It has several steps. Leave long tails and check the shape before you load it.",
    related: ["square-knot", "bowline"],
  },
  "square-knot": {
    job: "join",
    type: "Bend",
    line: "Ties two ends together snugly for bundles and bandages.",
    uses: [
      "Tie a parcel, bundle or bag closed.",
      "Fasten a bandage.",
      "Reef a sail, or tie two cords of the same size together.",
    ],
    watch:
      "Not for loads that matter. It can slip or capsize when pulled hard, and it does not join ropes of different sizes well.",
    related: ["zeppelin", "bowline"],
  },
  "poachers-knot": {
    job: "loop",
    type: "Noose",
    line: "A noose that slides shut under load and grips hard.",
    uses: [
      "Cinch a bundle or a load down tight.",
      "Fasten a rope around a post with a loop that tightens.",
      "Snares and lashing.",
    ],
    watch: "A noose tightens as you pull. Use it on objects, never on a person.",
    related: ["slip-knot", "clove-hitch"],
  },
  "daisy-chain": {
    job: "tidy",
    type: "Shortening",
    line: "Shortens a long rope into a chain you can carry.",
    uses: [
      "Store a long rope or extension cord without tangles.",
      "Carry a rope over your shoulder.",
      "Shorten a rope for a while and free it with one pull.",
    ],
    watch: "It undoes from the free end, so keep that end where you can reach it.",
    related: ["slip-knot", "overhand"],
  },
};
