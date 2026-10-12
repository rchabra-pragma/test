/**
 * Web has no AdMob SDK, and the native module imports react-native internals that Metro refuses to
 * bundle for web. The platform-specific file keeps that import out of the web bundle entirely.
 */
export default function AdBanner(_: { onHeight?: (h: number) => void }) {
  return null;
}
