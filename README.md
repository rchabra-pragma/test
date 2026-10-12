# Expense Manager

A day-to-day income and expense tracker built with Expo (SDK 57) and React Native. Entries live on the
device; they only leave it when you back them up to your own Google Drive.

- Log income and expenses in **55+ currencies** — amounts in different currencies are never added together
- Browse by **day, month or year**, and page back through history
- **Category donut charts** with drill-down into every entry behind a slice
- Export any period as **CSV or PDF**
- **Google Drive backup/restore** into a private app folder
- Dark and light themes, iOS + Android + web

## Getting started

```bash
npm install
npm start          # Expo dev server
npm run android    # or: npm run ios / npm run web
```

Expo Go is enough for everyday work. Ads and anything else native need a development build:

```bash
npx expo run:android      # or: npx expo run:ios
```

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
```

Anything importing React or a native module belongs in `src/ui` or `src/services`, never in `src/lib`.

## Tests

No framework — `node:assert/strict` and `tests/*.test.ts`, run directly by Node (>= 22 strips the types).

```bash
npm test                        # every tests/**/*.test.ts
node --test tests/logic.test.ts # one suite
npm run typecheck               # tsc --noEmit
npm run lint                    # eslint
npm run verify                  # lint + typecheck + test (run this before pushing)
```

The pre-commit hook runs lint + typecheck only — tests are left out to keep commits fast.
Skip it with `git commit --no-verify` or `SKIP_HOOKS=1`.

New or changed logic gets a test. Pure one-liners and purely presentational JSX do not.

## Configuration

Secrets and account-specific ids are **not** committed. Fill these in `app.json` before a real build:

| Key | Purpose |
| --- | --- |
| `expo.extra.google.{ios,android,web}` | OAuth client ids for Google Drive backup. Empty = backup hidden. |
| `expo.extra.admob.{bannerIos,bannerAndroid}` | AdMob banner unit ids, used in release builds only (empty = no ad). Development always serves Google's test ad, so you can never rack up invalid traffic on your own live units. |
| `expo.extra.androidUpdateUrl` | Optional JSON feed (`{version, notes, url}`) powering the Android update prompt. |
| `react-native-google-mobile-ads` plugin `androidAppId` / `iosAppId` | AdMob **app** ids. Currently Google's public test ids — replace before shipping. |

Google Drive uses the **authorization-code + PKCE** flow. Google rejects the implicit flow for installed
apps, so do not switch `responseType` back to `Token`.

## Building and releasing

```bash
npm run build:apk     # internal Android APK
npm run build:prod    # production AAB + iOS store build
```

EAS profiles live in `eas.json`: `development`, `preview`, `apk`, `production`.
Before submitting, `eas.json` needs your real `ascAppId` and a Play service-account key.

### Store checklist

- [ ] Real AdMob app ids + banner unit ids (test ids must not ship)
- [ ] Google OAuth client ids, consent screen verified, privacy policy URL live
- [ ] Apple: `ascAppId`, screenshots (iPhone + iPad), App Privacy answers
- [ ] Google Play: service-account key, Data Safety form, content rating
- [ ] Tested in portrait **and** landscape, on phone and tablet, both themes

iPad builds must support every orientation and resize cleanly in Split View and Stage Manager, so
`orientation` stays `default` — do not lock it to portrait.

## Conventions

- TypeScript `strict`, no `any`, explicit exported types
- Responsive by construction: flex, percentages and `useWindowDimensions()`; no hardcoded layout sizes
- Safe areas via `react-native-safe-area-context` — never hardcode a status-bar or home-indicator inset
- Cross-platform APIs first; reach for `Platform.select` or a `.web.tsx` file only where a platform genuinely differs
- No new dependency for what a few lines of stdlib or React Native can do

See `AGENTS.md` for the full contributor rules.

## License

MIT — see [LICENSE](./LICENSE).
