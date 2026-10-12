# Privacy Policy for Expense Manager

**Last updated:** REPLACE_WITH_DATE
**Contact:** REPLACE_WITH_SUPPORT_EMAIL

> **Draft.** This reflects what the app actually does as built, but it is not legal advice.
> Have it reviewed before publishing, and update it whenever the app's data handling changes.

Expense Manager ("the app", "we") is an offline-first personal expense tracker. This policy
explains what the app stores, what leaves your device, and what choices you have.

## Summary

- Your expenses stay **on your device** by default.
- We operate **no servers** and have **no account system**. We never receive your expense data.
- Google Drive backup is **optional** and goes to a private folder only this app can read.
- The app shows ads, which use an advertising identifier.

## What the app stores on your device

All of the following is written to your device's local app storage and never leaves it unless you
explicitly enable Google Drive backup:

- Transactions: amount, category, note, date, and type (income or expense)
- Your chosen currency, theme, and app preferences

Uninstalling the app deletes this local data.

## Google Drive backup (optional, off by default)

If you connect Google Drive from Settings:

- The app requests only the **`drive.appdata`** scope. This grants access to a hidden,
  application-specific folder in your Drive. **The app cannot see, read, or modify any other file
  in your Google Drive.**
- A single JSON file containing your transactions and settings is uploaded to that folder so you
  can restore it on another device.
- The data is stored in **your** Google account, under your control, governed by
  [Google's Privacy Policy](https://policies.google.com/privacy). We never receive a copy.
- Authentication uses OAuth 2.0 with PKCE. Access tokens are stored on your device only. The app
  never sees or stores your Google password.

**Revoking access and deleting the backup.** Settings → *Delete backup & disconnect* removes the
backup file from your Drive and revokes the app's access token. You can also revoke access at any
time at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

## Advertising

The app displays banner ads supplied by **Google AdMob**. To serve them, AdMob may collect and
process device information including an advertising identifier (IDFA on iOS, Advertising ID on
Android), coarse location derived from IP address, and ad interaction data. See
[How Google uses information from sites or apps that use our services](https://policies.google.com/technologies/partner-sites).

**Your expense data is never shared with advertisers.** It is not transmitted off your device for
advertising, and ad SDKs have no access to it.

On iOS you are asked for permission before any personalised advertising identifier is used. If you
decline, you will still see ads, but non-personalised ones. You can change this later in
iOS Settings → Privacy & Security → Tracking. On Android, opt out via
Settings → Google → Ads → Delete advertising ID.

## Exporting and sharing

CSV export and PDF statements are generated **on your device**. They go only where you choose to
send them through your device's standard share sheet. We receive nothing in this process.

## Update checks (Android)

If an update feed is configured, the app may request a static JSON file describing the latest
available version. This request carries no personal data and no identifiers beyond the standard
network metadata (such as IP address) present in any HTTP request.

## Children's privacy

The app is not directed at children under 13. We do not knowingly collect personal information
from children. If you believe a child has provided personal information, contact us and we will
remove it.

## Your rights

Because your data lives on your own device and in your own Google account, you have direct control:

- **Access and portability** — export your data as CSV or PDF at any time.
- **Deletion** — delete individual transactions in the app, delete the Drive backup from Settings,
  or uninstall the app to remove all local data.
- **Withdraw consent** — disconnect Google Drive, or revoke access from your Google account.

Depending on where you live, you may have additional rights under the GDPR, UK GDPR, or CCPA.
Since we hold no personal data about you, most such requests are satisfied by the controls above.
For anything else, contact us at the address at the top of this policy.

## Data we do not collect

For clarity, the app contains **no** analytics SDK, **no** crash reporting, **no** user accounts,
**no** email collection, and **no** tracking across other apps or websites.

## Changes to this policy

Material changes will be reflected here with an updated date, and where appropriate noted in the
app's release notes.
