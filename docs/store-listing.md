# Store listing and compliance answers

Pre-written copy and form answers for submission. Character limits are noted; counts in
parentheses are for the text as written. Review and adjust the tone before submitting.

---

## 1. Google Play listing

**App name** (max 30) — `Expense Manager` (15)

**Short description** (max 80)

```
Track spending offline. Private by design, with optional Google Drive backup.
```
(77)

**Full description** (max 4000)

```
Expense Manager is a fast, private expense tracker that works entirely offline.

Add income and expenses in seconds, see where your money actually goes, and keep
your records on your own device — no account, no sign-up, no servers.

WHAT YOU GET

• Quick entry — log a transaction in a couple of taps
• Categories and notes to keep spending organised
• Clear summaries by day, week, month and year
• A donut breakdown that shows your biggest spending categories at a glance
• Multi-currency support with correct decimal handling
• Light and dark themes that follow your system setting
• Works on phones and tablets, in portrait and landscape

PRIVATE BY DESIGN

Your expenses are stored on your device. There is no account to create and no
server receiving your data.

OPTIONAL GOOGLE DRIVE BACKUP

Connect Google Drive and your data is backed up to a hidden folder that only this
app can access — we request the minimum possible permission, so the app can never
see the rest of your Drive. Restore it on a new device whenever you need, or delete
the backup and disconnect from Settings at any time.

EXPORT YOUR DATA

Export to CSV for a spreadsheet, or generate a printable PDF statement. Your data
is yours, and it is never locked in.

This app is supported by ads.
```

**Category** — Finance
**Tags** — expense tracker, budget, personal finance
**Contains ads** — Yes
**In-app purchases** — No

---

## 2. App Store listing

**Name** (max 30) — `Expense Manager` (15)

**Subtitle** (max 30) — `Private offline expense log` (27)

**Promotional text** (max 170)

```
Track spending in seconds. Everything stays on your device, with optional private
Google Drive backup and CSV or PDF export whenever you need it.
```
(145)

**Keywords** (max 100, comma-separated, no spaces after commas)

```
expense,budget,spending,money,finance,tracker,cash,savings,receipt,csv,offline,daily,log
```
(88)

**Description** — reuse the Play full description above; the App Store allows 4000 characters too.

**Support URL** and **Marketing URL** — required. A simple GitHub Pages site is acceptable.

---

## 3. Play Data Safety form

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** (because of ads) |
| Is all data encrypted in transit? | **Yes** |
| Do you provide a way to delete data? | **Yes** — in-app, Settings → Delete backup & disconnect |

**Data types to declare:**

| Type | Collected | Shared | Purpose | Optional? |
| --- | --- | --- | --- | --- |
| Device or other IDs (advertising ID) | Yes | Yes | Advertising or marketing | No |
| App activity → app interactions | Yes | Yes | Advertising or marketing | No |
| Approximate location (from IP, by the ad SDK) | Yes | Yes | Advertising | No |

**Do not declare** financial info as collected. Expense amounts never leave the device, and
Drive backup goes to the user's own account — Play's definition excludes data the developer
cannot access. Note this in the form's explanation field if prompted.

---

## 4. Apple App Privacy answers

Declare these under "Data Used to Track You" and "Data Linked to You":

| Data type | Used to track | Linked to identity | Purpose |
| --- | --- | --- | --- |
| Identifiers → Device ID (IDFA) | Yes | No | Third-Party Advertising |
| Usage Data → Advertising Data | Yes | No | Third-Party Advertising |
| Usage Data → Product Interaction | No | No | Analytics (ad SDK only) |

Everything else: **Data Not Collected**. Financial Info is explicitly **not** collected.

**ATT prompt copy** (already configured in `app.json`):

> This lets us show ads that are more relevant to you. Your expense data is never shared.

---

## 5. Google OAuth verification

The `drive.appdata` scope is classified **sensitive**, so verification is required before the
app can be used by more than 100 users. No CASA security assessment is needed.

**Scope justification** (paste into the consent screen form)

```
Expense Manager is an offline personal expense tracker. Users who want to move their
data to a new device, or protect it against device loss, can optionally enable backup.

We request only drive.appdata, the narrowest scope available for this purpose. It gives
the app a private application folder that is invisible to the user's other files, and it
grants no access to any other document in the user's Drive. We considered drive.file but
it is broader than we need, as we never interact with user-selected files.

The app writes exactly one JSON file containing the user's own transactions and settings,
and reads it back on request to restore them. No data is transmitted to our servers — we
operate none — and nothing is shared with any third party. Backup is off by default and
requires explicit user action. Users can delete the backup and revoke access from within
the app at any time.
```

**Demo video requirements** — unlisted YouTube video showing, in order:

1. The app's OAuth consent screen, with the URL bar showing your verified client ID
2. The permission being granted
3. What the app does with that permission (write a backup, then restore it)
4. The user revoking access via Settings → Delete backup & disconnect

---

## 6. Screenshot shot list

Capture after a build with realistic sample data — avoid empty states, avoid lorem ipsum.

**Required sizes**

| Store | Device | Size |
| --- | --- | --- |
| App Store | iPhone 6.9" | 1320×2868 |
| App Store | iPad 13" | 2064×2752 (**mandatory**, the app supports tablet) |
| Play | Phone | 1080×1920 min |
| Play | 7" and 10" tablet | required if listed as tablet-compatible |

**Screens, in listing order**

1. Home with a populated transaction list
2. The donut category breakdown
3. Add/edit transaction sheet
4. Monthly summary
5. Settings showing Drive backup
6. Dark theme variant of screen 1

Also needed for Play: **feature graphic, 1024×500**.

---

## 7. Release notes, v1.0.0

```
First release.

• Fast offline expense and income tracking
• Category breakdown and period summaries
• Optional private Google Drive backup
• CSV and PDF export
• Light and dark themes, phone and tablet
```
