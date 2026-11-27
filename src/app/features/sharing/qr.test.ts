import { describe, expect, it } from "vitest";
import { generateFavoritesUri, parseFavoritesUri, validateFavoritesImport } from "./qr";

describe("favorites QR URI encoding & decoding", () => {
  it("encodes favorites and version to knots:// URI", () => {
    const uri = generateFavoritesUri(["bowline", "clove-hitch"], "0.1.0");
    expect(uri).toBe("knots://fav?v=0.1.0&k=bowline%2Cclove-hitch");
  });

  it("encodes > 2 favorites to compact bitmask URI", () => {
    const uri = generateFavoritesUri(["overhand", "slip-knot", "figure-eight"], "0.1.0");
    expect(uri.startsWith("knots://fav?v=0.1.0&b=")).toBe(true);
    const parsed = parseFavoritesUri(uri);
    expect(parsed?.knotIds).toEqual(["overhand", "slip-knot", "figure-eight"]);
  });

  it("handles empty favorites", () => {
    const uri = generateFavoritesUri([], "0.1.0");
    expect(uri).toBe("knots://fav?v=0.1.0");
  });

  it("parses valid knots://fav URI", () => {
    const parsed = parseFavoritesUri("knots://fav?v=0.2.0&k=bowline,clove-hitch,daisy-chain");
    expect(parsed).toEqual({
      version: "0.2.0",
      knotIds: ["bowline", "clove-hitch", "daisy-chain"],
    });
  });

  it("parses URI without k parameter as empty array", () => {
    const parsed = parseFavoritesUri("knots://fav?v=0.1.0");
    expect(parsed).toEqual({
      version: "0.1.0",
      knotIds: [],
    });
  });

  it("parses web fallback URL", () => {
    const parsed = parseFavoritesUri("https://knots.local/fav?v=0.3.0&k=figure-eight");
    expect(parsed).toEqual({
      version: "0.3.0",
      knotIds: ["figure-eight"],
    });
  });

  it("returns null for non-favorites text", () => {
    expect(parseFavoritesUri("hello world")).toBeNull();
    expect(parseFavoritesUri("https://google.com")).toBeNull();
    expect(parseFavoritesUri("https://example.com/favorite-recipes")).toBeNull();
    expect(parseFavoritesUri("knots://fav/")).toEqual({ version: "0.1.0", knotIds: [] });
  });

  it("encodes and decodes 200 knots into compact bitmask URI under 60 bytes", () => {
    // Generate 200 fake catalog knot IDs
    const catalog200 = Array.from({ length: 200 }, (_, i) => `knot-${i}`);
    // Pick 50 favorites across the catalog
    const favorites = catalog200.filter((_, i) => i % 4 === 0); // 50 knots

    const uri = generateFavoritesUri(favorites, "0.1.0", catalog200);
    expect(uri.startsWith("knots://fav?v=0.1.0&b=")).toBe(true);
    // 25 bytes in base64 is ~34 chars, total URI ~56 chars
    expect(uri.length).toBeLessThan(70);

    const parsed = parseFavoritesUri(uri, catalog200);
    expect(parsed).not.toBeNull();
    expect(parsed?.knotIds).toEqual(favorites);
    expect(parsed?.knotIds.length).toBe(50);
  });

  it("decodes bitmask against CANONICAL_KNOT_IDS regardless of display menu order", () => {
    const favorites = ["overhand", "bowline", "daisy-chain"];
    const uri = generateFavoritesUri(favorites, "0.1.0");
    expect(uri.startsWith("knots://fav?v=0.1.0&b=")).toBe(true);

    // Omitting catalog override decodes via CANONICAL_KNOT_IDS, matching encoding
    const parsedCanonical = parseFavoritesUri(uri);
    expect(parsedCanonical?.knotIds).toEqual(favorites);

    // Passing a reordered display catalog would decode wrong knot IDs
    const reorderedDisplayOrder = ["daisy-chain", "bowline", "overhand"];
    const parsedWithDisplayOrder = parseFavoritesUri(uri, reorderedDisplayOrder);
    expect(parsedWithDisplayOrder?.knotIds).not.toEqual(favorites);
  });
});

describe("validateFavoritesImport", () => {
  const catalog = ["bowline", "clove-hitch", "figure-eight", "overhand"];

  it("identifies known knots when versions match", () => {
    const res = validateFavoritesImport(["bowline", "figure-eight"], "0.1.0", catalog, "0.1.0");
    expect(res.knownKnotIds).toEqual(["bowline", "figure-eight"]);
    expect(res.unknownKnotIds).toEqual([]);
    expect(res.isNewer).toBe(false);
  });

  it("identifies unknown knots from newer sender version", () => {
    const res = validateFavoritesImport(
      ["bowline", "daisy-chain", "monkey-fist"],
      "0.2.0",
      catalog,
      "0.1.0",
    );
    expect(res.knownKnotIds).toEqual(["bowline"]);
    expect(res.unknownKnotIds).toEqual(["daisy-chain", "monkey-fist"]);
    expect(res.isNewer).toBe(true);
    expect(res.senderVersion).toBe("0.2.0");
    expect(res.receiverVersion).toBe("0.1.0");
  });
});
