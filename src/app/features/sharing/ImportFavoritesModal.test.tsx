import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { APP_VERSION } from "../../shared/version";
import { ImportFavoritesModal } from "./ImportFavoritesModal";

describe("ImportFavoritesModal", () => {
  it("omits newer-version warning when isNewer is false and unknown knots are present", () => {
    const html = renderToStaticMarkup(
      <ImportFavoritesModal
        payload={{
          version: "0.1.0",
          knotIds: ["bowline", "mystery-knot"],
        }}
        onClose={vi.fn()}
      />,
    );

    expect(html).not.toMatch(/Shared from a newer version/i);
    expect(html).toMatch(
      />1 knot \(mystery-knot\) requires updating Knots to view, but will still be saved to your favorites\.<\/p>/i,
    );
  });

  it("shows newer-version warning when isNewer is true", () => {
    const html = renderToStaticMarkup(
      <ImportFavoritesModal
        payload={{
          version: "0.2.0",
          knotIds: ["bowline", "mystery-knot"],
        }}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain(
      `Shared from a newer version (v0.2.0, you have v${APP_VERSION}). 1 knot (mystery-knot) requires updating Knots to view, but will still be saved to your favorites.`,
    );
  });
});
