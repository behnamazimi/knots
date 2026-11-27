export type Vec3 = [number, number, number];

/** A point a guide passes through. Leave out `p` to hold still at the previous point. */
export interface GuideKey {
  t: number;
  p?: Vec3;
}

/**
 * An invisible pin that moves one point of the rope. The physics does the rest:
 * the rope sags, drags on the table, collides with itself and cinches.
 */
export interface Guide {
  /** Index into `KnotDef.ropes`. Leave it out for the first rope. */
  rope?: number;
  /** Where on the rope: 0 is the standing end, 1 is the working end. */
  at: number;
  /** Seconds. The guide grabs the rope wherever it is at this moment. */
  grab: number;
  /** Targets after the grab, in time order. The guide lets go at the last key. */
  path: GuideKey[];
  /** Softness of the pull (XPBD compliance, m/N). Leave it out for a firm grip; larger values pull like a spring. */
  compliance?: number;
  /** Strongest pull in newtons. Leave it out for a light hand; cinching stiff rope needs more. */
  force?: number;
}

export interface RopeDef {
  length: number;
  radius: number;
  /**
   * Where the rope starts, as a polyline from its standing end. It should be as long as `length`
   * and rest on the table (y = radius) or hang in the air to drop; a straight line is the usual start.
   */
  start: Vec3[];
  /** Rope colour, e.g. "#2f5fb3". Leave it out for natural tan; give each rope of a bend its own. */
  color?: string;
}

/** A fixed object for rope to tie around: a pole, ring segment or rail. Never moves. */
export interface Prop {
  /** A capsule is the axis `a`→`b` swept by `radius` with round ends; a cylinder has flat ends. */
  kind: "capsule" | "cylinder";
  a: Vec3;
  b: Vec3;
  radius: number;
}

export interface Step {
  t: number;
  title: string;
}

/**
 * Everything that makes one knot. Adding a knot means adding one of these;
 * ropes start along their `start` polylines and the table is at y = 0.
 */
export interface KnotDef {
  id: string;
  name: string;
  summary: string;
  addedDate?: string;
  ropes: RopeDef[];
  props?: Prop[];
  duration: number;
  steps: Step[];
  guides: Guide[];
}
