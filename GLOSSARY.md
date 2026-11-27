# Knots Made Easy

Interactive 3D knot-tying guide and physics simulator running on web and an Android WebView host.

## Language

**PlatformBridge**:
The single host-capability seam mediating between the app and either the Android WebView bridge or browser APIs.
_Avoid_: NativeBridge, KnotsNative, bridge helper

**Preferences**:
Persistent user settings and saved favorites, including theme, rendering quality, onboarding state, and update-check state.
_Avoid_: localStorage settings, config store

**KnotViewer**:
The 3D presentation module that owns the WebGL stage, rope meshes, simulation timeline, and playback readiness policy for one active knot.
_Avoid_: viewer service, session wrapper

**FavoritesTransfer**:
The share and import flow for exporting favorite knots as a QR code or link and importing incoming payloads into saved favorites.
_Avoid_: QR modal manager, scanner flow

**NativeAppShell**:
The mobile tab-based navigation frame used when the app runs inside the native Android host or standalone display mode.
_Avoid_: mobile home, app container
