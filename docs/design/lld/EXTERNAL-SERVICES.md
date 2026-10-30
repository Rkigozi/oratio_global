# LLD: External Services And Handoffs

Last reviewed: 2026-10-20. FR-07/09/10/13; NFR-01/02/05/08.
Parent: [HLD](../../ARCHITECTURE.md). Owners: `SCRUM-81/82/83/74`, launch
`SCRUM-36/37/39/73` and security `SCRUM-47`.

## Translation

Native detail loads the saved language preference and calls
`translatePrayerText({ prayerId, text, targetLanguage })` only on demand. It
normalises language, bounds source text to 500 characters and invokes the
Supabase `translate` function with `{ q, target }`. The in-memory cache key uses
prayer ID, target and a content fingerprint rather than embedding raw text.
Translation result content is still held in memory; a content-free key is not a
claim of content-free storage or a cryptographic privacy guarantee.

```text
on-demand action -> cache lookup
  -> miss: Supabase function -> Google Translation -> validate response
  -> translated / not-needed result, or null on error
  -> display readable original on failure; allow switching to original
```

The function accepts POST/OPTIONS, rejects missing/invalid q/target, trims and
caps q, and sends text with `format: text` to Google using a server-only API key.
Its response uses the provider's `data.translations` envelope. Failures are
reported without returning the provider response. There is no persisted SQL
translation cache or invented custom `/prayers/:id/translate` API.

**Open boundary:** the client uses the signed-in Supabase SDK, but the checked-in
translate handler does not itself verify `auth.getUser`, and no checked-in
function gateway configuration establishes its deployed JWT setting. Full review
must verify actual gateway authentication, payload/target/cost controls and
provider privacy under `SCRUM-47/82`; do not label this as independently verified
just because the app requires login. Provider/billing access and real delivery
remain open. This pass neither calls Google with prayer text nor changes billing.

## Account Deletion

Settings requires deliberate confirmation before `deleteAccount`. The shared
adapter obtains the current session and invokes `delete-account` with its bearer
token, returning an error string or null according to the existing response
contract. On confirmed success the app leaves the account journey.

The Edge Function accepts POST/OPTIONS, verifies the supplied token with
`auth.getUser(token)` and uses a server-only service-role client to delete that
verified user's Auth record. It does not accept a client-selected user ID.
Declared foreign-key cascades remove associated SQL records.

The function contains no explicit avatar-object enumeration/removal or external
provider erasure workflow. SQL cascades alone do not prove those assets are gone.
Storage retention/deletion, provider data handling, error/log privacy and
disclosures must be checked in the existing account/security/recovery release
review. This design is not a new promise of erasure from every backup/provider.

Never test deletion on a real account without explicit authorisation. Existing
recorded disposable-account QA remains evidence only for its tested scope/build.

## Sharing And Web Routes

Native `getPrayerShareUrl` produces an HTTPS `/prayer/<encoded-id>` URL from the
configured web origin. Share content respects anonymous display; the app rejects
Private and archived targets before opening the share sheet or clipboard.

The web AuthGuard returns a signed-out visitor through login with a safe next
destination. Detail fetch is still RLS-authorised: a Circle link is not an invite,
a private URL is not access, and an expired public URL is unavailable to peers.
Renewal restores the same link, not a replacement prayer ID.

Native password reset currently uses a web `/update-password` destination.
Legal/support routes are opened through the external-link adapter. The website
must keep these flows and protected `/moderate` and `/admin/service-notices`
working during the `SCRUM-74` landing cutover.

Production domain, auth redirect allowlists/email templates, share metadata and
universal-link association/signed-build routing require separate configuration
and tests. There is currently no basis to promise every link opens the installed
iOS app or gives a working App Store fallback. Local scheme parsing tests alone
do not prove a deployed domain association.

## Failure And Privacy Rules

- Translation failure keeps the original; do not submit a failed translation as
  a successful prayer edit or erase the readable text.
- Deletion feedback follows the server response; timeout/ambiguous-response
  handling and provider/object cleanup need release verification.
- External opening/copy/share returns actual availability or failure feedback,
  not an unconditional copied/sent message.
- Function keys and service-role keys are server configuration only. Client
  public Supabase configuration is not a substitute for authorisation.
- No prayer/report text, access token or precise device coordinate belongs in
  analytics, error context or design examples. Translation is a distinct
  on-demand transmission of text, requiring appropriate release privacy review.

## Source And Verification

- [Translation adapter](../../../apps/mobile/src/services/prayer-translation.ts),
  [language helpers](../../../packages/shared/src/translation.ts),
  [translate handler](../../../supabase/functions/translate/index.ts).
- [Account adapter](../../../packages/shared/src/queries/account.ts),
  [delete handler](../../../supabase/functions/delete-account/index.ts),
  [Settings](../../../apps/mobile/src/screens/settings.tsx).
- [External links](../../../apps/mobile/src/services/external-links.ts),
  [sharing](../../../apps/mobile/src/services/prayer-sharing.ts),
  [web routes](../../../apps/web/src/app/routes.tsx),
  [AuthGuard](../../../apps/web/src/app/components/auth/auth-guard.tsx).
- Tests: [native translation](../../../apps/mobile/src/services/prayer-translation.test.ts),
  [web translation](../../../apps/web/src/app/services/translate.test.ts),
  [native sharing](../../../apps/mobile/src/services/prayer-sharing.test.ts),
  [Settings](../../../apps/mobile/src/screens/settings.test.tsx),
  [web password update](../../../apps/web/src/app/pages/auth/update-password.test.tsx),
  [web auth guard](../../../apps/web/src/app/components/auth/auth-guard.test.tsx).

Run both app suites/type checks for contract changes. Existing live QA commands
`npm run qa:translation` and `npm run qa:account-deletion` require deliberate
environment/account selection and authorisation; they are not safe defaults for
a documentation pass. Repeat domain/login/shared-link/install fallback on the
actual signed candidate before asserting native link or provider readiness.
