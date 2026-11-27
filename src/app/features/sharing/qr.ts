import { generate } from "lean-qr";
import { CANONICAL_KNOT_IDS } from "../../../engine/knots/canonical";
import { getInstalledVersion, isNewerVersion } from "../../shared/version";

export const FAVORITES_SCHEME = "knots";
export const FAVORITES_HOST = "fav";

export interface ParsedFavoritesPayload {
  version: string;
  knotIds: string[];
  bitmask?: string;
}

export interface FavoritesValidationResult {
  knownKnotIds: string[];
  unknownKnotIds: string[];
  isNewer: boolean;
  senderVersion: string;
  receiverVersion: string;
}

/**
 * Encodes an array of favorite knot IDs using a bitmask against a reference catalog.
 * 200 knots = 200 bits = 25 bytes (~34 base64 chars).
 */
export function encodeKnotBitmask(
  favoriteIds: string[],
  catalogIds: readonly string[] = CANONICAL_KNOT_IDS,
): string {
  const set = new Set(favoriteIds);
  const byteCount = Math.ceil(catalogIds.length / 8);
  const bytes = new Uint8Array(byteCount);

  for (let i = 0; i < catalogIds.length; i++) {
    if (set.has(catalogIds[i])) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i % 8;
      bytes[byteIndex] |= 1 << bitIndex;
    }
  }

  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decodes a base64 bitmask back into knot IDs using a reference catalog.
 * Bits beyond catalogIds length represent future knots from newer versions.
 */
export function decodeKnotBitmask(
  bitmaskB64: string,
  catalogIds: readonly string[] = CANONICAL_KNOT_IDS,
): string[] {
  try {
    let b64 = bitmaskB64.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const totalBits = bytes.length * 8;
    const result: string[] = [];
    for (let i = 0; i < totalBits; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i % 8;
      if ((bytes[byteIndex] & (1 << bitIndex)) !== 0) {
        if (i < catalogIds.length) {
          result.push(catalogIds[i]);
        } else {
          result.push(`knot-future-${i + 1}`);
        }
      }
    }
    return result;
  } catch {
    return [];
  }
}

/**
 * Encodes an array of favorite knot IDs and app version into a compact URI:
 * Uses human-readable slugs for <= 2 knots, and compact bitmask for > 2 knots (testing threshold).
 */
export function generateFavoritesUri(
  knotIds: string[],
  version: string = getInstalledVersion(),
  catalogIds: readonly string[] = CANONICAL_KNOT_IDS,
): string {
  const cleanVersion = version.replace(/^v/, "").trim();
  const cleanIds = knotIds.map((id) => id.trim()).filter(Boolean);
  const params = new URLSearchParams();
  params.set("v", cleanVersion);

  if (catalogIds && cleanIds.length > 2) {
    const bitmask = encodeKnotBitmask(cleanIds, catalogIds);
    params.set("b", bitmask);
  } else if (cleanIds.length > 0) {
    params.set("k", cleanIds.join(","));
  }
  return `${FAVORITES_SCHEME}://${FAVORITES_HOST}?${params.toString()}`;
}

/**
 * Parses a QR code string or pasted link into favorites payload.
 * Supports:
 * - knots://fav?v=0.1.0&k=overhand,bowline (slug mode)
 * - knots://fav?v=0.1.0&b=... (bitmask mode for 200+ knots)
 * - https://knots.local/fav?v=...&k=...
 * - fav?v=...&k=...
 */
export function parseFavoritesUri(
  raw: string,
  catalogIds: readonly string[] = CANONICAL_KNOT_IDS,
): ParsedFavoritesPayload | null {
  if (!raw || typeof raw !== "string") return null;

  const trimmed = raw.trim();

  // Try extracting query string
  let queryStr = "";
  if (trimmed.startsWith("knots://fav?") || trimmed.startsWith("knots://fav/")) {
    const qIdx = trimmed.indexOf("?");
    queryStr = qIdx >= 0 ? trimmed.slice(qIdx + 1) : "";
  } else if (trimmed.startsWith("knots://fav")) {
    queryStr = "";
  } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      if (url.searchParams.has("k") || url.searchParams.has("b")) {
        queryStr = url.search.replace(/^\?/, "");
      } else {
        return null;
      }
    } catch {
      return null;
    }
  } else if (trimmed.startsWith("fav?") || trimmed.startsWith("?")) {
    queryStr = trimmed.slice(trimmed.indexOf("?") + 1);
  } else if (trimmed.includes("v=") && (trimmed.includes("k=") || trimmed.includes("b="))) {
    // raw query string
    queryStr = trimmed;
  } else {
    return null;
  }

  try {
    const params = new URLSearchParams(queryStr);
    const version = (params.get("v") || "0.1.0").replace(/^v/, "").trim();
    const rawB = params.get("b");
    const rawK = params.get("k");

    let knotIds: string[] = [];
    if (rawB && catalogIds) {
      knotIds = decodeKnotBitmask(rawB, catalogIds);
    } else if (rawK) {
      knotIds = rawK
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    }

    return { version, knotIds, bitmask: rawB ?? undefined };
  } catch {
    return null;
  }
}

/**
 * Validates scanned knot IDs against the local knot catalog and checks if the sender
 * version is newer than the receiver's current version.
 */
export function validateFavoritesImport(
  knotIds: string[],
  senderVersion: string,
  catalogKnotIds: string[],
  receiverVersion: string = getInstalledVersion(),
): FavoritesValidationResult {
  const catalogSet = new Set(catalogKnotIds);
  const knownKnotIds: string[] = [];
  const unknownKnotIds: string[] = [];

  for (const id of knotIds) {
    if (catalogSet.has(id)) {
      knownKnotIds.push(id);
    } else {
      unknownKnotIds.push(id);
    }
  }

  const isNewer = isNewerVersion(senderVersion, receiverVersion);

  return {
    knownKnotIds,
    unknownKnotIds,
    isNewer,
    senderVersion,
    receiverVersion,
  };
}

/**
 * Renders QR code to a canvas element using lean-qr.
 */
export function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options?: {
    pad?: number;
    onColor?: [number, number, number];
    offColor?: [number, number, number];
  },
): void {
  const code = generate(text);
  code.toCanvas(canvas, {
    pad: options?.pad ?? 2,
    on: options?.onColor ?? [28, 32, 40], // ink color
    off: options?.offColor ?? [255, 253, 249], // paper color
  });
}
