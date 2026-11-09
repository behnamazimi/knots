import { describe, expect, it } from "vitest";
import { RANK, indexLogins, normalize, searchLogins, wordStarts } from "./search";

const find = (logins: string[], query: string, limit?: number) =>
  searchLogins(indexLogins(logins), query, limit);
const names = (logins: string[], query: string, limit?: number) =>
  find(logins, query, limit).map((m) => m.login);

describe("stargazer search", () => {
  it("ignores case, a leading @ and spaces", () => {
    expect(normalize("  @BehnamAzimi ")).toBe("behnamazimi");
    expect(names(["octocat", "BehnamAzimi"], " @behnamazimi")).toEqual(["BehnamAzimi"]);
    expect(names(["octocat", "behnamazimi"], "BEHNAM")).toEqual(["behnamazimi"]);
  });

  it("finds nothing for an empty query", () => {
    expect(find(["octocat"], "")).toEqual([]);
    expect(find(["octocat"], " @ ")).toEqual([]);
  });

  it("splits logins into words on dashes, underscores, digits and camelCase", () => {
    expect(wordStarts("swift-sailor42")).toEqual([6, 12]);
    expect(wordStarts("tidy_fox")).toEqual([5]);
    expect(wordStarts("behnamAzimi")).toEqual([6]);
    expect(wordStarts("HTMLParser")).toEqual([4]);
    expect(wordStarts("x9y")).toEqual([1, 2]);
  });

  it("ranks exact, then prefix, word, substring and fuzzy matches", () => {
    const logins = ["seasailor", "sailro", "swift-sailor", "sailorman", "sailor", "nobody"];
    const found = find(logins, "sailor");
    expect(found.map((m) => m.login)).toEqual([
      "sailor",
      "sailorman",
      "swift-sailor",
      "seasailor",
      "sailro",
    ]);
    expect(found.map((m) => m.rank)).toEqual([
      RANK.exact,
      RANK.prefix,
      RANK.word,
      RANK.substring,
      RANK.fuzzy,
    ]);
    expect(found.map((m) => m.at)).toEqual([0, 0, 6, 3, -1]);
  });

  it("matches the middle of a login, and words after a dash, a digit or a capital", () => {
    expect(names(["octocat", "behnamazimi"], "azimi")).toEqual(["behnamazimi"]);
    const words = find(["calm-otter7", "rusty42fox", "bigFalcon"], "fox");
    expect(words.map((m) => [m.login, m.rank])).toEqual([["rusty42fox", RANK.word]]);
    expect(find(["bigFalcon"], "falcon")[0].rank).toBe(RANK.word);
    expect(find(["calm-otter7"], "7")[0].rank).toBe(RANK.word);
    // A later occurrence at a word start beats an earlier one mid-word.
    expect(find(["xab-ab"], "ab")[0]).toMatchObject({ rank: RANK.word, at: 4 });
  });

  it("forgives letters left out, and one typo once four letters are typed", () => {
    expect(names(["behnamazimi"], "bhnmzm")).toEqual(["behnamazimi"]); // letters in order
    expect(names(["behnamazimi"], "behnamazmii")).toEqual(["behnamazimi"]); // one extra
    expect(names(["behnamazimi"], "bihnam")).toEqual(["behnamazimi"]); // one wrong
    expect(names(["behnamazimi"], "bhenam")).toEqual(["behnamazimi"]); // two swapped
    expect(names(["behnam-azimi"], "azimo")).toEqual(["behnam-azimi"]); // a typo in a later word
    expect(names(["behnamazimi"], "bih")).toEqual([]); // too short to guess at
    expect(names(["behnamazimi"], "bixxam")).toEqual([]); // two typos
  });

  it("breaks ties by the shorter login, then the earlier star", () => {
    const found = find(["knotty-two", "knotty-one", "knotty", "knotty-1"], "knot");
    expect(found.map((m) => m.login)).toEqual(["knotty", "knotty-1", "knotty-two", "knotty-one"]);
    expect(found.map((m) => m.index)).toEqual([2, 3, 0, 1]);
  });

  it("returns only the best few, with each one's star", () => {
    const logins = Array.from({ length: 40 }, (_, i) => `rigger${i}`);
    const found = find(logins, "rigger", 6);
    expect(found).toHaveLength(6);
    expect(found[0]).toEqual({ index: 0, login: "rigger0", rank: RANK.prefix, at: 0 });
    expect(found.map((m) => m.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("keeps up with 50,000 stars", () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const word = () =>
      Array.from({ length: 3 + Math.floor(rand() * 6) }, () =>
        String.fromCharCode(97 + Math.floor(rand() * 26)),
      ).join("");
    const logins = Array.from({ length: 50_000 }, (_, i) =>
      i === 31_337 ? "behnamazimi" : `${word()}-${word()}${i}`,
    );
    const index = indexLogins(logins);
    const queries = ["a", "be", "azimi", "behnamazmi", "zzzzqq", "@Behnam", "qx-"];
    // Best of a few runs: the bakes in the other test files keep every core busy.
    const best = (q: string) => {
      let ms = Infinity;
      for (let k = 0; k < 5; k++) {
        const t0 = performance.now();
        searchLogins(index, q);
        ms = Math.min(ms, performance.now() - t0);
      }
      return ms;
    };
    const slowest = Math.max(...queries.map(best));
    expect(searchLogins(index, "azimi")[0]).toMatchObject({ index: 31_337, rank: RANK.substring });
    expect(searchLogins(index, "behnamazmi")[0].login).toBe("behnamazimi");
    // A frame is 16 ms; this leaves room for a slow CI machine.
    expect(slowest).toBeLessThan(40);
  });
});
