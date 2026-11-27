import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getFavorites,
  mergeFavorites,
  overwriteFavorites,
  setFavorites,
  toggleFavorite,
} from "./favorites";
import { createMemoryStorageAdapter, resetStorageAdapter, setStorageAdapter } from "./storage";

describe("favorites store", () => {
  beforeEach(() => {
    setStorageAdapter(createMemoryStorageAdapter());
    setFavorites([]);
  });

  afterEach(() => {
    resetStorageAdapter();
  });

  it("returns referentially stable arrays when unchanged", () => {
    const first = getFavorites();
    const second = getFavorites();
    expect(first).toBe(second);
  });

  it("updates and returns new array when toggled", () => {
    const wasAdded = toggleFavorite("bowline");
    expect(wasAdded).toBe(true);
    expect(getFavorites()).toContain("bowline");

    const wasRemoved = !toggleFavorite("bowline");
    expect(wasRemoved).toBe(true);
    expect(getFavorites()).not.toContain("bowline");
  });

  it("merges favorites without duplicates", () => {
    setFavorites(["bowline", "clove-hitch"]);
    const res = mergeFavorites(["clove-hitch", "figure-eight", "overhand"]);
    expect(res.addedCount).toBe(2);
    expect(res.totalCount).toBe(4);
    expect(getFavorites()).toEqual(["bowline", "clove-hitch", "figure-eight", "overhand"]);
  });

  it("overwrites favorites completely", () => {
    setFavorites(["bowline", "clove-hitch"]);
    const res = overwriteFavorites(["figure-eight", "overhand", "figure-eight"]);
    expect(res.totalCount).toBe(2);
    expect(getFavorites()).toEqual(["figure-eight", "overhand"]);
  });
});
