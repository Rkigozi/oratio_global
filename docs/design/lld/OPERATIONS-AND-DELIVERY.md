# LLD: Operations And Delivery

Last reviewed: 2026-10-21. FR-12 and NFR-01 through NFR-08.
Parent: [HLD](../../ARCHITECTURE.md). Exact owners: [traceability](../TRACEABILITY.md).

## Independent Service Notices

The native informational banner reads a Netlify function independently of the
product data path. Its purpose is to communicate planned disruption; it is not
a hard maintenance gate or a guarantee when all providers/networking are down.

| Contract                                 | Behavior                                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GET `/.netlify/functions/service-notice` | Public read: `{ notice }` or null; no administrator metadata; no-store and public-read CORS                                  |
| GET with `?manage`                       | Verify bearer token through Supabase Auth and a server-side notice-admin ID allowlist; return notice/version/update metadata |
| PUT                                      | Same authority; same-origin check, JSON/stream size <=8192 bytes, strict schema, expected version, future expiry             |
| Notice data                              | ID, title <=60 code points, message <=240, display starts/ends, optional maintenance starts/ends                             |
| Version conflict                         | Conditional write fails with 409; reload rather than overwrite another edit                                                  |
| Unavailable service                      | Sanitised 503; no secrets or unpublished record in error output                                                              |

Display interval is at most seven days. Maintenance interval is separate and
formatted in the viewer's locale/timezone; neither interval can end before it
starts. Publishing creates a new notice ID; withdrawing writes a null notice.
The adapter uses strongly consistent Netlify Blobs and conditional ETags. Only
published production context uses the production store; preview/unpublished
deploys get a deployment-specific store. Unknown context fails safely.

Notice admin authority uses `ORATIO_NOTICE_ADMIN_IDS`, verified against a real
token subject. It is not implied by `profiles.is_moderator` or a client-supplied
ID. Production configuration/permanent operator approval remain separate from
the isolated test deployment described in the runbook.

The native hook refreshes every 60 seconds while active, on foreground and at
display/expiry boundaries. Network requests abort after six seconds. It validates
and caches a response by endpoint in AsyncStorage, retains an unexpired cached
notice on failure and remembers dismissal by notice ID. No notice error blocks
navigation or prayer submission. This cache contains informational notices, not
an offline prayer database.

## Monitoring And Privacy

Native JS monitoring requires explicit valid enable flag, approved HTTPS DSN,
environment and version/build/SHA metadata. Disabled configuration does not even
load the SDK. Initialisation/capture failure is best-effort and cannot prevent
app registration or normal use.

Current SDK configuration disables native crash collection, replay, automatic
session/performance tracking, logs, screenshots/view hierarchy and breadcrumbs.
`beforeSend` and a final envelope allowlist remove unapproved event data/types
and attachments. The shared exception sink maps operation names to safe labels.
The non-production Settings smoke action is unavailable in production.

The controlled Expo Go event/email and filtered follow-up were verified on
2026-10-20. Full provider-payload review, native crash privacy, source-map
symbolication, native PostHog and signed-build acceptance remain open under
`SCRUM-43`; the [monitoring record](../../backlog/NATIVE-MONITORING.md) owns the evidence.
Do not enable replay or pass prayer/report text, emails, tokens or precise
coordinates to improve debugging. New telemetry needs its own privacy review.

## Build And Deployment Contracts

Mobile implementation and Expo Go acceptance precede signed-build validation.
TestFlight entry requires active Apple Developer Program membership and release
approval. Supporting website conversion belongs to release preparation; see
[release readiness](../../V1_RELEASE_READINESS.md) and
[website boundaries](../../backlog/WEB-PRESENCE.md).

One root npm lockfile covers the workspaces. CI uses Node 22; installation applies
and verifies the existing scoped Forge Node backport. CI has separate web,
mobile and disposable PostgreSQL jobs. Native export uses nonfunctional public
CI configuration with dotenv disabled; it is not a cloud signing operation.

| Path               | Current Contract                                                                                    | Separate Acceptance                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Expo Go            | `npm run dev:mobile`, local development server                                                      | Not App Store/TestFlight distribution                                              |
| iOS JS export      | `export:ios` in mobile workspace                                                                    | Bundling only, not a native binary                                                 |
| EAS                | Committed source required; production/store Release profile and internal simulator profile prepared | Apple enrolment, signing, environment, actual binary/install/upgrade acceptance    |
| Web                | `main` drives Netlify web build/deploy                                                              | Does not publish iOS or apply database migrations                                  |
| Database           | New numbered migrations, explicit approved rollout before dependent client                          | Verify target/history/dry-run, before/after preservation and effective permissions |
| Backend correction | Reviewed forward migration                                                                          | Never edit applied history or reset retained user data as rollback                 |

Backend rollout through 045 is recorded in the relevant feature records. Expiry UI
is checkpointed in `817b4b8`; current place-picker changes remain local. A
documentation or feature branch is not a production deploy.
EAS `preview` configuration does not provision an isolated backend automatically.

`audit:mobile` is the bounded development-review gate. The exact two-advisory
exception expires at `2026-11-13T00:00:00Z` exclusive, under pinned controls.
`audit:mobile:release` never uses that exception. No silent expansion/renewal or
public-release waiver is created by this LLD. Use the
[security record](../../backlog/SECURITY-REVIEW.md) for exact evidence/scope.

## Recovery, Operations And Quality

Use [NFR-CHECKLIST.md](../../NFR-CHECKLIST.md) as the single source for latency,
capacity, accessibility, alert and recovery budgets. These are targets, not
current measurements or provider guarantees. Feature unit tests/Expo timings
do not replace signed-build timing, VoiceOver/Dynamic Type or recovery evidence.

Recovery inventory must cover schema/data/policies, Auth, stored objects,
functions/configuration/secrets and deletion/revocation reconciliation. Database
backup coverage must not be assumed to include avatar objects. Verify the plan,
retention, alerts and isolated restore before claiming RPO/RTO acceptance.
Documentation neither authorises a paid upgrade nor copying live private data
into a test project. No production restore is part of normal QA.

The daily web smoke workflow is not continuous native/backend monitoring. Verify
the actual launch domain and controlled failed-check notification, then name
incident/moderation owners, review coverage, escalation and initial cost/quotas.
Do not promise an unstaffed 24/7 response. Final acceptance belongs to `SCRUM-40`.

## Source And Verification

- [Notice contract](../../../packages/shared/src/service-notice.ts),
  [server handler](../../../apps/web/server/service-notice.ts),
  [Netlify adapter](../../../apps/web/netlify/functions/service-notice.ts),
  [native hook](../../../apps/mobile/src/hooks/use-service-notice.ts),
  [editor](../../../apps/web/src/app/pages/service-notices.tsx).
- [Monitoring](../../../apps/mobile/src/services/monitoring.ts),
  [payload/envelope privacy](../../../apps/mobile/src/services/monitoring-privacy.ts),
  [configuration](../../../apps/mobile/src/services/monitoring-config.ts),
  [CI](../../../.github/workflows/ci.yml),
  [smoke workflow](../../../.github/workflows/smoke.yml),
  [EAS profiles](../../../apps/mobile/eas.json).
- Tests: [server notice](../../../apps/web/server/service-notice.test.ts),
  [adapter isolation](../../../apps/web/server/service-notice-adapter.test.ts),
  [native notice](../../../apps/mobile/src/hooks/use-service-notice.test.ts),
  [monitoring lifecycle](../../../apps/mobile/src/services/monitoring.test.ts),
  [privacy](../../../apps/mobile/src/services/monitoring-privacy.test.ts),
  [config](../../../apps/mobile/src/services/monitoring-config.test.ts),
  [disposable database runner](../../../scripts/test-moderation-db.mjs).

Commands: app suites/type checks, web lint/build, `npm run test:db`,
`npm run test:security-backports`, the review audit and strict release audit.
Passing one gate does not turn another into a pass. For operational actions use
the [notice](../../backlog/SERVICE-NOTICES.md),
[monitoring](../../backlog/NATIVE-MONITORING.md) and
[build](../../backlog/IOS-BUILD-PIPELINE.md) runbooks with their required approvals.
