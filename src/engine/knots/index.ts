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
