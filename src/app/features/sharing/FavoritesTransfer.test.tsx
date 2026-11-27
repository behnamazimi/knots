import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FavoritesTransfer,
  INITIAL_TRANSFER_STATE,
  executeCameraScan,
  readClipboardFavorites,
  transferReducer,
  type FavoritesTransferController,
} from "./FavoritesTransfer";

const mockScannerBridge = vi.hoisted(() => ({
  isNativeScannerAvailable: vi.fn(() => false),
  startNativeScanner: vi.fn<() => Promise<string>>(),
  readClipboardText: vi.fn<() => Promise<string | null>>(() => Promise.resolve(null)),
  copyTextToClipboard: vi.fn<() => Promise<boolean>>(() => Promise.resolve(true)),
  shareFavoritesLink: vi.fn<() => Promise<boolean>>(() => Promise.resolve(true)),
}));

vi.mock("./scannerBridge", () => mockScannerBridge);

function createController(
  overrides: Partial<FavoritesTransferController> = {},
): FavoritesTransferController {
  return {
    step: { kind: "idle" },
    toastMessage: null,
    openShare: vi.fn(),
    openImport: vi.fn(),
    close: vi.fn(),
    openPaste: vi.fn(),
    openPayload: vi.fn(),
    startCameraScan: vi.fn(async () => {}),
    notifyImported: vi.fn(),
    ...overrides,
  };
}

describe("FavoritesTransfer state machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScannerBridge.isNativeScannerAvailable.mockReturnValue(false);
    mockScannerBridge.readClipboardText.mockResolvedValue(null);
  });

  it("transitions across share, choice, paste, import, and idle", () => {
    const share = transferReducer(INITIAL_TRANSFER_STATE, { type: "openShare" });
    expect(share.kind).toBe("share");

    const choice = transferReducer(share, { type: "openImport" });
    expect(choice.kind).toBe("choice");

    const paste = transferReducer(choice, {
      type: "openPaste",
      initialValue: "knots://fav?v=0.1.0&k=bowline",
    });
    expect(paste).toEqual({
      kind: "paste",
      initialValue: "knots://fav?v=0.1.0&k=bowline",
    });

    const payload = { version: "0.1.0", knotIds: ["bowline"] };
    const importing = transferReducer(paste, { type: "openPayload", payload });
    expect(importing).toEqual({ kind: "import", payload });

    const idle = transferReducer(importing, { type: "close" });
    expect(idle.kind).toBe("idle");
  });

  it("falls back to paste when native scanner is unavailable", async () => {
    const dispatch = vi.fn();
    const showToast = vi.fn();
    mockScannerBridge.isNativeScannerAvailable.mockReturnValue(false);

    await executeCameraScan(dispatch, showToast);

    expect(dispatch).toHaveBeenCalledWith({ type: "openPaste" });
    expect(showToast).not.toHaveBeenCalled();
  });

  it("handles native camera scan success, invalid QR, cancel, and error", async () => {
    const dispatch = vi.fn();
    const showToast = vi.fn();
    mockScannerBridge.isNativeScannerAvailable.mockReturnValue(true);

    mockScannerBridge.startNativeScanner.mockResolvedValueOnce("knots://fav?v=0.1.0&k=bowline");
    await executeCameraScan(dispatch, showToast);
    expect(dispatch).toHaveBeenCalledWith({
      type: "openPayload",
      payload: { version: "0.1.0", knotIds: ["bowline"] },
    });

    mockScannerBridge.startNativeScanner.mockResolvedValueOnce("https://example.com");
    await executeCameraScan(dispatch, showToast);
    expect(showToast).toHaveBeenCalledWith("Scanned code is not a Knots favorites QR code");

    showToast.mockClear();
    mockScannerBridge.startNativeScanner.mockRejectedValueOnce(new Error("User cancelled"));
    await executeCameraScan(dispatch, showToast);
    expect(showToast).not.toHaveBeenCalled();

    mockScannerBridge.startNativeScanner.mockRejectedValueOnce(
      new Error("Camera permission denied"),
    );
    await executeCameraScan(dispatch, showToast);
    expect(showToast).toHaveBeenCalledWith("Camera permission denied");
  });

  it("reads and parses clipboard favorites URI", async () => {
    mockScannerBridge.readClipboardText.mockResolvedValueOnce("  knots://fav?v=0.1.0&k=bowline  ");
    const hit = await readClipboardFavorites();
    expect(hit).toEqual({
      text: "knots://fav?v=0.1.0&k=bowline",
      payload: { version: "0.1.0", knotIds: ["bowline"] },
    });

    mockScannerBridge.readClipboardText.mockResolvedValueOnce("not a link");
    const miss = await readClipboardFavorites();
    expect(miss).toBeNull();
  });
});

describe("FavoritesTransfer rendering", () => {
  it("renders nothing when idle and no toast", () => {
    const html = renderToStaticMarkup(
      <FavoritesTransfer favorites={["bowline"]} transfer={createController()} />,
    );
    expect(html).toBe("");
  });

  it("renders ShareFavoritesModal for share step", () => {
    const html = renderToStaticMarkup(
      <FavoritesTransfer
        favorites={["bowline"]}
        transfer={createController({ step: { kind: "share" } })}
      />,
    );
    expect(html).toContain("Share Favorites");
    expect(html).toContain('role="dialog"');
  });

  it("renders ScanChoiceSheet for choice step", () => {
    const html = renderToStaticMarkup(
      <FavoritesTransfer
        favorites={["bowline"]}
        transfer={createController({ step: { kind: "choice" } })}
      />,
    );
    expect(html).toContain("Import Favorites");
    expect(html).toContain("Scan QR with Camera");
    expect(html).toContain("Paste Link or Code");
  });

  it("renders ScannerModal with prefilled value for paste step", () => {
    const html = renderToStaticMarkup(
      <FavoritesTransfer
        favorites={["bowline"]}
        transfer={createController({
          step: { kind: "paste", initialValue: "knots://fav?v=0.1.0&k=bowline" },
        })}
      />,
    );
    expect(html).toContain("Parse &amp; Import");
    expect(html).toContain("knots://fav?v=0.1.0&amp;k=bowline");
  });

  it("renders ImportFavoritesModal for import step and status toast when present", () => {
    const html = renderToStaticMarkup(
      <FavoritesTransfer
        favorites={["bowline"]}
        transfer={createController({
          step: {
            kind: "import",
            payload: { version: "0.1.0", knotIds: ["bowline"] },
          },
          toastMessage: "Imported 1 favorites",
        })}
      />,
    );
    expect(html).toContain("Knots to Import (1)");
    expect(html).toContain('role="status"');
    expect(html).toContain("Imported 1 favorites");
  });
});
