import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { KnotDef } from "../../engine/knots/types";
import type { Player } from "../../engine/playback/player";
import type { KnotViewer } from "../../engine/render/viewer";
import type { StartViewer } from "../features/viewer";
import { setPlatformAdapter, createMemoryPlatformAdapter } from "../shared/platformBridge";
import { KnotStage } from "./KnotStage";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (init: unknown) => [init, vi.fn()],
  };
});

vi.mock("../features/viewer", () => ({
  ViewerCanvas: () => null,
  ResetViewButton: () => null,
}));

vi.mock("../features/player", () => ({
  PlayerBar: () => null,
  ShareButton: () => null,
}));

vi.mock("../features/tuner", () => ({
  Tuner: () => null,
}));

describe("KnotStage", () => {
  let restorePlatform: (() => void) | undefined;

  afterEach(() => {
    restorePlatform?.();
    restorePlatform = undefined;
    vi.clearAllMocks();
  });

  it("passes knot, player, options to viewer.show() and clears viewer on stop()", () => {
    (globalThis as Record<string, unknown>).matchMedia = vi.fn(() => ({ matches: false }));
    restorePlatform = setPlatformAdapter(
      createMemoryPlatformAdapter({ isMobileDevice: () => true }),
    );

    const player = {} as unknown as Player;
    const knot = { id: "overhand", name: "Overhand", steps: [] } as unknown as KnotDef;
    const physics = {} as Parameters<typeof KnotStage>[0]["physics"];

    const tree = KnotStage({
      knot,
      player,
      physics,
    }) as ReactElement<{
      children: ReactElement<{
        start?: StartViewer;
        batterySaver?: boolean;
        lowDensity?: boolean;
      }>[];
    }>;

    const viewerCanvas = tree.props.children.find((child) => child?.props?.start);
    expect(viewerCanvas?.props.start).toBeTypeOf("function");
    expect(viewerCanvas?.props.batterySaver).toBe(false);
    expect(viewerCanvas?.props.lowDensity).toBe(true);

    const mockViewer = { show: vi.fn(), clear: vi.fn() } as unknown as KnotViewer;
    const onDrawn = vi.fn();
    const stop = viewerCanvas!.props.start!(mockViewer, onDrawn);

    expect(mockViewer.show).toHaveBeenCalledWith(knot, player, {
      physics,
      autoPlay: true,
      lowDensity: true,
      onFirstDraw: onDrawn,
    });
    expect(mockViewer.clear).not.toHaveBeenCalled();

    stop();

    expect(mockViewer.clear).toHaveBeenCalledTimes(1);
  });
});
