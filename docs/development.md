# Development

Everything you need to work on the app day to day. For release and store submission, see
[release.md](./release.md).

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node | **>= 22** | Required. Tests rely on Node's native TypeScript type stripping. |
| npm | >= 10 | Ships with Node 22. This project uses npm — `package-lock.json` is the committed lockfile. |
| Expo Go | latest | Enough for most UI work. |
| Xcode | 16+ | macOS only, for iOS native builds and the simulator. |
| Android Studio | latest | For the Android emulator and SDK. |

> This repo is npm-based. Stray `pnpm-lock.yaml` / `pnpm-workspace.yaml` files are gitignored,
> because EAS Build infers the package manager from the lockfile and will use the wrong one.

## First run

```bash
git clone <repo-url>
cd test
npm run setup
```

`npm run setup` is the one-step path: it checks your Node version, installs dependencies, wires up
the git hooks and starts the dev server. Flags:

| Flag | Effect |
| --- | --- |
| `--android` / `--ios` / `--web` | Open that platform directly |
| `--no-start` | Set up only, don't start the dev server |

Pass them after `--`, for example `npm run setup -- --android`.

Doing it by hand instead:

```bash
npm install          # also installs the git hooks via the "prepare" script
npm start            # Expo dev server
```

Then press `a` for Android, `i` for iOS, or `w` for web. Or go straight there:

```bash
npm run android
npm run ios
npm run web
```

### When Expo Go is not enough

Expo Go cannot load native modules that are not already bundled into it. In this project that
means **AdMob**. The app degrades gracefully — the ad banner simply renders nothing — so most
work is unaffected. To exercise native code, make a development build:

```bash
npx expo run:android
npx expo run:ios
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run setup` | One-step setup: toolchain check, install, hooks, start |
| `npm start` | Expo dev server |
| `npm run android` / `ios` / `web` | Start on a specific platform |
| `npm test` | Every `tests/**/*.test.ts` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with autofix |
| `npm run verify` | lint + typecheck + test — run before pushing |
| `npm run build:apk` | EAS internal Android APK |
| `npm run build:prod` | EAS production AAB + iOS store build |

## Project layout

The split that matters: **business logic is pure and UI-free**, so it is testable with plain Node.

```
App.tsx              screen composition and app state
index.ts             entry point
src/lib/             pure logic — no React, Expo or AsyncStorage imports
  logic.ts           transactions, periods, grouping, totals, CSV, ids, dates
  currency.ts        currency table, symbols, minor units
  report.ts          printable HTML statement
src/ui/              React components (.web.tsx where a platform differs)
src/services/        side-effectful integrations: drive, pdf, update
tests/               all tests, *.test.ts, excluded from the app build
docs/                development, release, privacy policy, store listing
```

Anything importing React or a native module belongs in `src/ui` or `src/services`, never in
`src/lib`. Name the boundary a change belongs to before writing it, and put it there — not in
whichever file is already open.

## Testing

No test framework. Just `node:assert/strict` and files in `tests/`, run directly by Node.

```bash
npm test                        # all suites
node --test tests/logic.test.ts # one suite
```

New or changed logic gets a test. Pure one-liners and purely presentational JSX do not.

Because the logic layer imports nothing from React or Expo, tests need no mocks, no fixtures and
no renderer. Keep it that way — if something is awkward to test, the dependency usually belongs in
`src/ui` or `src/services` instead.

## Code quality

A **pre-commit hook** (`.githooks/pre-commit`, wired up by `npm install`) runs lint and typecheck.
Tests are deliberately excluded to keep commits fast — run `npm run verify` before pushing.

```bash
git commit --no-verify     # bypass once
SKIP_HOOKS=1 git commit    # same thing
```

**IntelliJ / WebStorm** users get ESLint autofix on save from the committed
`.idea/jsLinters/eslint.xml`. For VS Code, add to `.vscode/settings.json`:

```json
{ "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" } }
```

## Conventions

- TypeScript `strict`, no `any`, explicit exported types
- Responsive by construction: flex, percentages and `useWindowDimensions()`; no hardcoded layout sizes
- Safe areas via `react-native-safe-area-context` — never hardcode a status-bar or home-indicator inset
- Cross-platform APIs first; reach for `Platform.select` or a `.web.tsx` file only where a platform
  genuinely differs (status bars, shadows vs elevation, keyboard behaviour)
- Prefer pure functions over stateful helpers
- No new dependency for what a few lines of stdlib or React Native can do
- Split a new file per domain rather than growing one; do not add folder layers until a folder has
  real siblings

`AGENTS.md` holds the same rules in the form AI coding agents consume.

## Gotchas

**Expo SDK 57 changed a lot.** Check the versioned docs at
<https://docs.expo.dev/versions/v57.0.0/> rather than a blog post or older answer.

**Metro resolves `require()` statically, even inside `try`/`catch`.** A runtime `Platform.OS`
guard will not keep a native-only module out of the web bundle. Use a `.web.tsx` platform file
instead — see `src/ui/AdBanner.web.tsx` and `src/ui/DateField.web.tsx`.

**Transaction ids double as sort keys.** `newId()` returns `` `${Date.now()}-${random}` `` so that
string comparison stays chronological. A plain UUID would silently break ordering and the Drive
restore merge.

**Ads always use Google's test unit in development**, regardless of configuration. Serving your own
live ads in a dev build is invalid traffic and gets AdMob accounts suspended.

**`npx expo install --fix` fails if `expo` itself is outdated.** Run `npm install expo@<target>`
first, then re-run it.
