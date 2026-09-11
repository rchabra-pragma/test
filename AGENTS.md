# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# UI

- All UI must be responsive: no hardcoded widths/heights for layout, use flex, percentages and `useWindowDimensions()`. Handle both portrait and landscape, phone and tablet.
- Every change must work on both Android and iOS. Use cross-platform RN/Expo APIs; only reach for `Platform.select` / `.ios.tsx` / `.android.tsx` when a platform genuinely differs (status bar, safe areas, shadows vs elevation, keyboard behavior).
- Respect safe areas and notches (`react-native-safe-area-context`), and system font scaling.
- Maximise device coverage: prefer OS-native / Expo Go-compatible APIs over exotic ones, keep the minimum supported OS versions Expo's defaults, and degrade gracefully instead of gating features on a device capability.

# Code & tests

Applies to every change from now on.

- **Tests**: any new or changed logic gets a test in the existing style — `node:assert/strict`, colocated `*.test.ts`, run with `node src/<name>.test.ts`. No test framework, no fixtures. Pure one-liners and pure-presentational JSX need no test.
- **Structure**: keep business logic pure and UI-free in `src/logic.ts` (or a sibling `src/<domain>.ts`); keep React/Expo code in `*.tsx`. Logic must stay importable by plain Node — no React, Expo or AsyncStorage imports in it. Split a new file per domain rather than growing one; do not add folder layers until a folder has real siblings.
- **Standards**: TypeScript `strict`, no `any`, explicit exported types, pure functions over stateful helpers, no new dependency for what a few lines of stdlib/RN can do. Keep `src/*.test.ts` excluded from the app build (tsconfig).
- Think at architecture level: name the boundary a change belongs to before writing it, and put it there — not in whatever file is already open.
