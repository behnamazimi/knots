import { bowline } from "./bowline";
import { cloveHitch } from "./clove-hitch";
import { daisyChain } from "./daisy-chain";
import { figureEight } from "./figure-eight";
import { overhand } from "./overhand";
import { poachersKnot } from "./poachers-knot";
import { slipKnot } from "./slip-knot";
import { squareKnot } from "./square-knot";
import type { KnotDef } from "./types";
import { zeppelin } from "./zeppelin";
export { CANONICAL_KNOT_IDS } from "./canonical";
export type { KnotDef };

/** Every knot in the app, in menu order. Add new knots here. */
export const knots: KnotDef[] = [
  overhand,
  slipKnot,
  figureEight,
  bowline,
  cloveHitch,
  zeppelin,
  squareKnot,
  poachersKnot,
  daisyChain,
];

/** The newest knot added to the app. */
export const LATEST_KNOT_ID = "daisy-chain";

/** Returns the latest addition date across all knots. */
export function getLatestAddedDate(): string {
  let latest = "";
  for (const k of knots) {
    if (k.addedDate && k.addedDate > latest) {
      latest = k.addedDate;
    }
  }
  return latest;
}

/** Returns true for all knots added on the latest addition date. */
export function isLatestKnot(id: string): boolean {
  const latestDate = getLatestAddedDate();
  if (!latestDate) return id === LATEST_KNOT_ID;
  const knot = knots.find((k) => k.id === id);
  return Boolean(knot?.addedDate && knot.addedDate === latestDate);
}
