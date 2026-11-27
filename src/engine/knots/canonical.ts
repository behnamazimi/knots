/**
 * CANONICAL_KNOT_IDS:
 * Permanent, append-only registry of knot IDs for bitmask QR encoding.
 *
 * CRITICAL RULE:
 * NEVER reorder, insert into the middle of, or remove items from this list.
 * Future knots MUST always be appended to the end of this array so that
 * bit index N always corresponds to the same knot across all app versions.
 */
export const CANONICAL_KNOT_IDS: readonly string[] = [
  "overhand", // bit 0
  "slip-knot", // bit 1
  "figure-eight", // bit 2
  "bowline", // bit 3
  "clove-hitch", // bit 4
  "zeppelin", // bit 5
  "square-knot", // bit 6
  "poachers-knot", // bit 7
  "daisy-chain", // bit 8
] as const;
