import { useIsNativeApp } from "../shared/appMode";
import { NativeAppShell } from "./NativeAppShell";
import { WebHomeScreen } from "./WebHomeScreen";

/** The front page: desktop web shows hero & stargazers; mobile app mode switches between tabs with BottomNav. */
export function HomeScreen() {
  return useIsNativeApp() ? <NativeAppShell /> : <WebHomeScreen />;
}
