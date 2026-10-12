# Expense Manager

A day-to-day income and expense tracker built with Expo (SDK 57) and React Native. Entries live on
the device; they only leave it when you back them up to your own Google Drive.

[Development](docs/development.md) · [Release](docs/release.md) ·
[Privacy policy](docs/privacy-policy.md) · [Store listing](docs/store-listing.md)

## Features

- Log income and expenses in **55+ currencies** — amounts in different currencies are never added together
- Browse by **day, month or year**, and page back through history
- **Category donut charts** with drill-down into every entry behind a slice
- Export any period as **CSV or PDF**
- **Google Drive backup/restore** into a private app folder the app alone can read
- Dark and light themes; phone and tablet; iOS, Android and web

## Quick start

Requires **Node >= 22**.

```bash
npm install
npm start          # then press a / i / w
```

Expo Go is enough for everyday work. Ads and other native modules need a development build —
see [development.md](docs/development.md#when-expo-go-is-not-enough).

## Documentation

| Document | Contents |
| --- | --- |
| [docs/development.md](docs/development.md) | Setup, commands, project layout, testing, conventions, gotchas |
| [docs/release.md](docs/release.md) | Configuration, builds, EAS, and the full go-live sequence |
| [docs/privacy-policy.md](docs/privacy-policy.md) | Privacy policy draft — host this before submitting |
| [docs/store-listing.md](docs/store-listing.md) | Store copy, Data Safety and App Privacy answers, screenshot list |
| [AGENTS.md](AGENTS.md) | The same contributor rules, in the form AI coding agents consume |

## Architecture

Business logic is **pure and UI-free**, so it is testable with plain Node — no mocks, no renderer.

```
App.tsx          screen composition and app state
src/lib/         pure logic: transactions, currency, reports
src/ui/          React components (.web.tsx where a platform differs)
src/services/    side-effectful integrations: drive, pdf, update
tests/           all tests, run with `npm test`
```

Anything importing React or a native module belongs in `src/ui` or `src/services`, never in `src/lib`.

## License

MIT — see [LICENSE](./LICENSE).
