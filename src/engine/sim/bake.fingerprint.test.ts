import { describe, expect, test } from "vitest";
import { knots } from "../knots";
import { bake } from "./bake";

// Hashes of every knot's baked positions. A refactor must leave them unchanged; a deliberate change
// to a knot or to the physics updates its hash here (the failure message prints the new one).
const FINGERPRINTS: Record<string, string> = {
  overhand: "6fa9fda654de",
  "slip-knot": "d0d933bace65",
  "figure-eight": "815fa7a4f198",
  bowline: "edc1585db70c",
  "clove-hitch": "e47109ab703c",
  zeppelin: "1d60633c1b56",
  "square-knot": "5ad8a78873cf",
  "poachers-knot": "e896f68b2854",
  "daisy-chain": "58a16779bccd",
};

describe("bake fingerprint", () => {
  test.each(knots.map((k) => [k.id, k] as const))(
    "%s bakes bit-identically",
    async (id, knot) => {
      const chunks: Float32Array[] = [];
      bake(knot, (c) => chunks.push(c.frames));
      const all = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
      chunks.reduce((at, c) => (all.set(c, at), at + c.length), 0);
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", all));
      const hex = [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
      expect(hex.slice(0, 12)).toBe(FINGERPRINTS[id]);
    },
    60_000,
  );
});
