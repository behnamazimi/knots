import { platform } from "../../shared/platformBridge";

export function isNativeScannerAvailable(): boolean {
  return platform.canScanQrCode();
}

export function readClipboardText(): Promise<string | null> {
  return platform.getClipboardText();
}

export function copyTextToClipboard(text: string): Promise<boolean> {
  return platform.copyToClipboard(text);
}

export function shareFavoritesLink(
  uri: string,
  title: string = "Favorite Knots",
): Promise<boolean> {
  return platform.shareText(uri, title);
}

export function startNativeScanner(): Promise<string> {
  return platform.scanQrCode();
}
