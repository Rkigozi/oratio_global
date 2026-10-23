# Native Monitoring

Tracking: [SCRUM-43](https://oratio.atlassian.net/browse/SCRUM-43).
Gate: NFR-05, before external TestFlight. Last updated: 2026-10-20.

## Local Implementation

The first slice reports **JavaScript errors in the iOS app**, using Expo 57's
recommended `@sentry/react-native` 7.11.0. It does not yet enable native crash
collection, PostHog, performance tracing or session replay. Reporting defaults
to off. The initial 2026-10-08 implementation had no provider configuration;
the approved project setup on 2026-10-13 is recorded below. The first controlled
Expo Go error and email alert were verified on 2026-10-20. A second event confirms
filtered geography and no empty-stack processing warning in Sentry's event view.
No source maps have been uploaded; full payload/privacy review remains open.

- Initialization precedes application imports. Incomplete/invalid configuration
  leaves reporting off; SDK failures do not prevent normal startup. The shared
  logger tolerates synchronous throws and asynchronous rejection from its sink.
- Explicit enablement, an approved Sentry SaaS public DSN, environment, app
  version, build and full Git SHA are required. Development bundles can only use
  `development`; signed bundles use `staging` or `production` and native build
  metadata. EAS supplies its commit through `app.config.js`, without exporting
  server secrets. The native build guard rejects invalid opted-in configuration.
- Error payloads are rebuilt from an allowlist before send and again at the SDK
  envelope boundary. Only generic error classes, fixed operation labels, bundle
  line/column coordinates, event IDs and validated release metadata remain.
  Raw messages, custom error names, users, URLs, source snippets, local paths,
  contexts, arbitrary tags/extras, attachments and breadcrumbs are removed.
  Outgoing SDK metadata requests no IP inference. The first live test still
  showed provider-derived geography; the additional server-side controls and
  remaining re-verification are recorded below.
- Default integrations are off except JavaScript error/rejection handling and
  the privacy boundary. No console/network capture, device identifiers, sessions,
  screenshots, view hierarchy, logs, analytics or replay are enabled. No user ID
  is assigned. Error text is intentionally generic; this trades some diagnostic
  detail for privacy. No source-map symbolication claim is made.
- A configured non-production build exposes **Settings > Diagnostics > Send
  test error**. It emits only a fixed synthetic error and reports a queued event
  reference, not confirmed delivery. The control is absent when disabled or in
  production. Network loss can drop events; offline native caching is not enabled.
- Existing local console logging is unchanged. This is not a full audit of
  console/device logs or of the existing web telemetry implementation.

The SDK's JavaScript `beforeSend` does not cover native crashes. Native SDK
initialization and crash capture remain explicitly disabled until native-side
privacy controls and a signed-build payload test are implemented. The SDK's
Expo setup and source-map guidance is at
[Expo: Using Sentry](https://docs.expo.dev/guides/using-sentry/).

## Setup And Verification

### Project Setup (2026-10-13)

- Created [oratio-mobile](https://oratio-3j.sentry.io/settings/projects/oratio-mobile/)
  in the existing `oratio-3j` organisation, using the React Native platform.
  Project ID: `4512249578061904`; assigned team: `#oratio`.
- Retained `javascript-react-router` (`4511569786765392`) for the website and
  protected moderation/admin pages. Separate projects keep
  mobile and web incidents distinguishable; no new account was created.
- Saved the mobile public DSN only in ignored `apps/mobile/.env.local`, with
  `EXPO_PUBLIC_SENTRY_ENABLED=false` and environment `development`. Existing
  Supabase and notice-QA configuration is preserved. No upload/auth token was
  created, and no credentials belong in this document or Git.
- Verified the [mobile error monitor](https://oratio-3j.sentry.io/monitors/2422508/)
  and its [enabled email alert](https://oratio-3j.sentry.io/monitors/alerts/1368358/).
  The alert applies only to `oratio-mobile`, across all environments, when a
  new/existing issue becomes high priority. Routing explicitly notifies
  `#oratio`, rather than relying on recently active members. It has no trigger
  history yet. Actual email delivery and the ten-minute target remain untested.
- Disabled automatic JavaScript source fetching; SCM source context remains
  off. Enabled TLS verification for Sentry outbound requests. Spike protection
  is enabled. Retention/consent choices and source-map symbolication still need
  release review; creating a project does not enable SDK collection.
- Before a smoke test, use the committed monitoring revision for
  `EXPO_PUBLIC_GIT_SHA`, explicitly enable development reporting, restart Metro
  and use the fixed Settings test action. Check issue priority and personal
  notification/digest settings when verifying the high-priority email rule;
  an ingested handled error alone is not proof the alert should fire.

### Controlled Verification

The 2026-10-13 setup checks accepted the prepared mobile DSN/metadata, confirmed
that reporting is disabled and that the local configuration is ignored by Git,
and passed 85 focused monitoring/settings/build-config tests. The first focused
run hit an existing Settings `findByText` timeout; the same suite passed unchanged
on rerun. This checkpoint adds provider/configuration evidence, not a new full
regression run or remote-delivery evidence.

1. Confirm the approved mobile Sentry project, data region/retention, access and
   named alert recipient. Review privacy disclosures and consent requirements
   before enabling collection; this change does not choose that policy.
2. For an approved synthetic-only Expo Go test, set the temporary overrides in
   ignored `apps/mobile/.env.development.local`, retaining the approved DSN in
   `.env.local`. Expo 57's development environment module merges dotenv values
   over shell values, so a shell-only enable flag can still leave reporting off.
   Preserve any existing overrides. Use a clean committed revision, restart Metro
   with its cache cleared, and fully reload the app in Expo Go. Do not reuse a
   web DSN by default.
3. Press **Send test error** once, record its reference and UTC trigger time,
   and confirm the event in Sentry within five minutes. Inspect the raw payload,
   environment, app version, build and SHA; check that no personal data appears.
4. Configure a new-issue alert to the named recipient and verify actual arrival
   within ten minutes. A queued reference is not evidence of either delivery or
   alerting. Record timestamps and evidence in SCRUM-43 without credentials.
5. Repeat with reporting disabled, an unavailable provider and offline networking.
   Normal app journeys must remain usable. Remove the temporary overrides,
   restart the normal server and fully reload the app afterwards.
6. Before external beta, implement/test native crash redaction, source-map
   symbolication and approved PostHog events. Repeat the error/alert/privacy
   exercise on a signed Release build with the real version/build/SHA. Expo Go
   verification cannot sign off native crash collection or the whole NFR.

```dotenv
EXPO_PUBLIC_SENTRY_ENABLED=true
EXPO_PUBLIC_SENTRY_DSN=<approved mobile project's public DSN>
EXPO_PUBLIC_SENTRY_ENVIRONMENT=development
EXPO_PUBLIC_GIT_SHA=<full 40-character SHA of the tested commit>
```

For signed QA builds use `staging`; EAS provides `EAS_BUILD_GIT_COMMIT_HASH`
automatically. Do not turn reporting on merely by choosing the production EAS
profile. No Sentry config plugin, Metro upload hook or automatic source upload
has been added. Future upload credentials belong only in build-time secrets,
never client configuration, source control or general project correspondence.

### First Expo Go Delivery And Alert (2026-10-20)

- The fixed Settings diagnostic reached `oratio-mobile` as
  [ORATIO-MOBILE-1](https://oratio-3j.sentry.io/issues/155016588/), event
  `606584df28604f64811f431bfef016d2`. The issue shows one handled synthetic
  error, no identified users, environment/build `development`, version `1.0.0`
  and full SHA `e374d1f469d3b088d661a8fd3950f8dad04b7d33`.
- The existing [high-priority rule](https://oratio-3j.sentry.io/monitors/alerts/1368358/)
  recorded one trigger for this issue at **22:07 UTC**. Email receipt was
  maintainer-reported by **22:11 UTC**. The exact device tap and inbox receipt
  timestamps were not captured, so these observations are not a complete timing
  measurement or signed-build acceptance.
- The event showed approximate provider-derived geography despite the client
  allowlist and no-inference metadata. Following configuration approval, the mobile project's
  **Prevent Storing of IP Addresses** setting was enabled and additional sensitive
  fields `city`, `subdivision`, `region`, `country_code` and `ip_address` were
  added. Both settings persisted after reload. Existing events are unaffected.
  [Sentry's guidance](https://www.sentry.help/en/articles/13964201-can-i-disable-ip-geolocation-for-gdpr-compliance)
  says changes can take 5-15 minutes to apply. A fresh event must verify actual
  scrubbing before the privacy check passes; no location values are copied here.
- Sentry also discarded an empty `exception.values.0.stacktrace.frames` value.
  A local follow-up omits stack traces when no allowlisted frames remain, without
  widening the frame allowlist. Its 56 focused monitoring/settings tests and
  mobile type-check pass. The full 318-test mobile suite also passes before the
  follow-up commit. A fresh provider-side check must use that committed revision;
  the first event does not verify the patch.
- The temporary development override was removed and Metro restarted with the
  normal development configuration. Inspection confirmed the served bundle's enable
  flag was `false`. No phone was connected to verify the reload at that checkpoint.
  No normal `.env.local` values
  were changed.

### Follow-Up Event (2026-10-20)

- A device screenshot supplied the queued diagnostic reference. Exact lookup
  found event `0235c346d2404505990b45ef21cb081f` in
  [ORATIO-MOBILE-1](https://oratio-3j.sentry.io/issues/155016588/events/0235c346d2404505990b45ef21cb081f/),
  timestamp **22:20:18.504 UTC**, environment/build `development`, version `1.0.0`
  and full SHA `c856c525cea245de8f1ca76ae8bd37eeae9e57cc`.
- This event's Geography displays `[Filtered] ([Filtered])`; the event detail
  view has no Processing Error warning or Event Processing Errors section. The
  missing stack trace is intentional when all frames are outside the allowlist.
  These observations verify the specific geography/empty-stack follow-ups, not
  every stored field or a complete provider-payload privacy audit.
- The earlier event still contains its original provider-derived geography:
  changing project scrubbing is not retroactive. No event was deleted or marked
  resolved, and no second alert email is claimed for an existing high-priority
  issue whose priority did not change.
- The follow-up source is committed, with 318 mobile tests passing. The approved
  push scope was the review branch with web deployment suppressed. Netlify's preview
  skip marker is set on PR #5; the evidence commit also uses `[skip netlify]`
  to suppress branch deploys. No EAS build/update or Apple submission is part of
  this push; see [the build runbook](./IOS-BUILD-PIPELINE.md#push-and-deployment-scope).

## Evidence And Remaining Gates

Local checks cover configuration/disabled states, production diagnostic gating,
payload allowlisting, attachment removal, real SDK envelopes using an in-memory
transport (including internal errors that bypass `beforeSend`), provider failure,
shared logger compatibility and the Settings test control. Jest preserves Expo
environment variables at runtime so enabled/disabled tests do not accidentally
reuse Babel-inlined values from a previous test.

On 2026-10-08, base `047a39b` plus these working-tree changes passed 304 mobile
tests, 537 web tests, both type checks, web lint/build, formatting, Expo Doctor
21/21 and a clean iOS export (3,453 modules, 22 assets). One earlier full mobile
run hit a prayer-detail `findByText` timeout; the unchanged full suite passed on
rerun. The real-SDK test also passes open-handle detection after cleaning up its
module-level cache interval in the test sandbox.

The disabled-reporting CI export is `index-c71315496b00f88eef08e6cbd6f78680.hbc`,
SHA-256 `32957aadd8c3972349a985dc202dd9845b647cd8a0cd28efc1b5f6c07cbe4262`.
Its 3,441 source-map entries contain none of the four advisory packages. The
artifact used nonfunctional backend values, no local dotenv file or notice-QA
endpoint; its source map remains local.

These are not hosted CI, a physical-device test, remote delivery or alert
evidence. The current dependency gate remains open: adding monitoring
did not change the four underlying advisories (12 moderate/45 high affected
entries across all dependencies, zero critical).

SCRUM-43 remains **In Progress**. Controlled Expo Go delivery and email receipt
are confirmed, as are filtered geography and no empty-stack processing warning
on the follow-up event. Full privacy/payload review, measured release-build timings,
privacy release choices, native crash privacy, symbolication, PostHog and
signed-build verification remain open. The live test does not sign off NFR-05
or authorize production collection, source-map uploads or a release deployment.
