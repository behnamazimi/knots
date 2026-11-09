import { expect, test } from "vitest";
import { knots } from "../../engine/knots";
import { JOBS, KNOT_INFO } from "./knotInfo";

test("every knot has its page copy, and related knots exist", () => {
  const ids = knots.map((k) => k.id);
  expect(Object.keys(KNOT_INFO).sort()).toEqual([...ids].sort());
  const jobs = JOBS.map(([id]) => id as string);
  for (const [id, info] of Object.entries(KNOT_INFO)) {
    expect(jobs, id).toContain(info.job);
    expect(info.related.length, id).toBeGreaterThan(0);
    for (const r of info.related) expect(ids, `${id} → ${r}`).toContain(r);
  }
});
