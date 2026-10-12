# Release and go-live

How to configure, build and ship the app. For day-to-day development see
[development.md](./development.md).

## Configuration

Account-specific ids are filled into `app.json` before a real build. They are **not** secret —
every one of them ships inside the APK/IPA in plain text and can be extracted by anyone — but they
are account-specific, so they are left blank in the repo.

| Key | Purpose |
| --- | --- |
| `expo.extra.google.{ios,android,web}` | OAuth client ids for Drive backup. Empty = backup hidden. |
| `expo.extra.admob.{bannerIos,bannerAndroid}` | AdMob banner unit ids, used in **release builds only**. Empty = no ad. |
| `expo.extra.androidUpdateUrl` | Optional JSON feed (`{version, notes, url}`) powering the Android update prompt. |
| `react-native-google-mobile-ads` plugin `androidAppId` / `iosAppId` | AdMob **app** ids. Currently Google's public test ids — the app **crashes natively** if these are wrong. |

### What is actually secret

These grant publishing or signing power and must never be committed. All are gitignored:

- Play service-account JSON (`play-service-account.json`)
- Apple App Store Connect API key (`.p8`)
- Android keystore (`.jks`)

Let EAS store the signing credentials (`eas credentials`). **Back up the Android keystore** — lose
it and you can never update the Play listing.

### Google Drive auth

Drive uses the **authorization-code + PKCE** flow. Google rejects the implicit flow for installed
apps, so do not switch `responseType` back to `Token`.

The app requests only `drive.appdata` — a private per-app folder, invisible to the rest of the
user's Drive. Google classifies this as a **sensitive** scope, so it needs OAuth verification
before public release, though not a CASA security assessment.

## Building

```bash
npm run build:apk     # internal Android APK
npm run build:prod    # production AAB + iOS store build
```

EAS profiles in `eas.json`: `development`, `preview`, `apk`, `production`.

```bash
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

## Go-live steps

### Phase 0 — Accounts

These gate everything else and have the longest lead times. Start them first.

1. **Apple Developer Program** — $99/yr; enrolment takes 24–48h, longer for organisations.
2. **Google Play Console** — $25 one-time. New personal accounts must complete a **12-tester,
   14-day closed test** before production access unlocks. This is the longest pole.
3. **AdMob account**, linked to both store listings.
4. **Expo account**, then `eas init` and `eas login` in the repo.

### Phase 1 — Privacy policy

5. Host [privacy-policy.md](./privacy-policy.md) at a public URL. Required by Apple, Play **and**
   Google OAuth verification. Fill in the date and support email placeholders first.

### Phase 2 — Google Drive credentials

6. Google Cloud Console → new project → **OAuth consent screen** (app name, logo, support email,
   privacy policy URL, scope justification, demo video).
7. Create **three** OAuth client ids: iOS (bundle id), Android (package + SHA-1 from
   `eas credentials`), and Web.
8. Paste them into `app.json` → `extra.google`.
9. **Submit for verification.** Until approved you are capped at 100 test users.

Justification copy and the demo video shot list are in
[store-listing.md](./store-listing.md#5-google-oauth-verification).

### Phase 3 — AdMob

10. Create the app in AdMob (one per platform) → two **app ids**.
11. Create one banner ad unit per platform → two **unit ids**.
12. Fill both into `app.json`, replacing the Google test ids in the plugin block.

### Phase 4 — Build credentials

13. `eas credentials` — let EAS generate and store the keystore and iOS certificates.
14. Play Console → create app → API access → service account → save the JSON as
    `./play-service-account.json`.
15. App Store Connect → create the app record → copy the numeric App ID into `eas.json` as
    `ascAppId`.

### Phase 5 — Store listings

16. Copy, Data Safety answers, App Privacy answers and the screenshot shot list are all in
    [store-listing.md](./store-listing.md).
17. Capture screenshots from a real build with realistic data — iPhone 6.9", iPad 13" (mandatory,
    the app supports tablet), Android phone and tablet. Plus a 1024×500 Play feature graphic.

### Phase 6 — Test build

18. Build with `npm run build:apk` and the `preview` iOS profile, install on **real devices**, and
    check what CI cannot: portrait and landscape, phone and tablet, light and dark, the Drive
    connect/restore/delete round trip, the iOS ATT prompt, and that ads render.
19. Start the Play closed test here to get the 14-day clock running.

### Phase 7 — Release

20. `npm run build:prod`, then `eas submit` for each platform.
21. Play: internal → closed → production. Apple: TestFlight → review (1–3 days typical).

## Checklist

- [ ] Real AdMob app ids + banner unit ids (test ids must not ship)
- [ ] Google OAuth client ids, consent screen verified, privacy policy URL live
- [ ] Apple: `ascAppId`, screenshots (iPhone **and** iPad), App Privacy answers
- [ ] Google Play: service-account key, Data Safety form, content rating
- [ ] Android keystore backed up somewhere safe
- [ ] Tested in portrait **and** landscape, on phone and tablet, both themes
- [ ] `npm run verify` passes

## Notes

**iPad.** Apple requires iPad apps to support every orientation and resize cleanly in Split View
and Stage Manager, so `orientation` stays `default` — do not lock it to portrait.

**Critical path.** Play's 14-day closed test and Google's OAuth verification run in parallel and
dominate the schedule — realistically 3–5 weeks. Everything else is hours of work.
