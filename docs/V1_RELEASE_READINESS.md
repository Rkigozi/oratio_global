# Oratio V1 Release Readiness

Last updated: 2026-10-14

Release-control checklist for the first small-group iOS beta and first public
Apple App Store release. Expo Go is the current development channel; TestFlight
is the release-candidate channel. Android follows later under `SCRUM-79` and is
not a dependency of V1.

Development security checkpoint (2026-10-14): the canonical Forge Node backport
is now installed reproducibly. The owner approved a narrow development-review
exception for two known tooling advisories, expiring `2026-11-13T00:00:00Z`.
The policy gate does not claim a clean raw audit or public-release acceptance;
`npm run audit:mobile:release` stays strict. See
[the active approval and evidence](./backlog/SECURITY-REVIEW.md). Previous
"no waiver/local-only" snapshots below describe their historical checkpoints.
The adoption commit `1c399be` passed hosted mobile, web and disposable database
checks in [CI run 38548461986](https://github.com/Rkigozi/oratio_global/actions/runs/38548461986),
including clean-install backport application. It is pushed to the review branch,
not merged to `main`; release gates below remain separate.

The [iOS NFR checklist](./NFR-CHECKLIST.md) defines measurable security,
reliability, performance, accessibility, monitoring, recovery and operational
acceptance. Beta gates apply before external TestFlight; launch gates apply
before the public App Store release. They remain unsigned, even where individual
functional tests passed. `SCRUM-40` owns the combined release decision.

## Release Gates

Local checkpoint (2026-10-07), based on `6b5a710` plus the build, security,
service-notice and profile-menu changes:

- Web: 534 tests passed; mobile: 255 tests passed.
- Disposable database: 140 assertions and nine concurrent-session cases passed.
- Web/mobile type checks, web lint/build and Expo Doctor (21/21) passed.
- Clean iOS JS/Hermes export passed with nonfunctional CI client values and no
  temporary notice-QA endpoint. This is not a signed native build.
- Local browser regressions: 38 passed, six authenticated tests skipped. No
  real-account credentials or production writes were used.
- Production audit after compatible patches: web zero; mobile/all workspaces
  seven moderate and 14 high affected-package entries, zero critical. The mobile
  CI audit gate remains blocked. The later tooling follow-up removed all critical
  findings: including development dependencies, web is zero and all workspaces
  have 12 moderate/45 high/zero critical entries from four underlying advisories.

These are local automated results, not hosted CI, a new physical-device QA pass,
or release sign-off. Existing web test render and build chunk-size warnings remain.
The checkpoint is local-only: no push, live migration or production deploy.

Implementation commits: `07b7e61` (iOS build preparation/dependencies), `69f0c07`
(database hardening), `848dc76` (maintenance notices) and `b219a5c` (profile options).
All remain local at this checkpoint; hosted CI has not evaluated these commits.

Tooling follow-up (same date): Vitest/coverage 4.1.11, sharp 0.35.5 and fast-uri
3.1.8 are installed, with explicit Node 22 types for the existing server code.
All 534 web and 255 mobile tests passed again, along with both type checks, clean
web lint, web build and 38 browser checks (six authenticated checks skipped).
Web CI is configured to audit development tools and generate coverage; the hosted
workflow has not run these changes. The clean iOS export's source map contains none of the
four remaining advisory packages, narrowing shipped-JavaScript exposure but not
clearing build-time risk. See [the current dependency review](./backlog/SECURITY-REVIEW.md).

```bash
npm run type-check
npm run type-check:mobile
npm run lint
npm test
npm run test:mobile
npm run test:coverage
npm run build
npm run audit:web:tooling
npm audit --omit=dev --audit-level=moderate
npm run export:ios --workspace @oratio/mobile
```

Run `npx expo-doctor` from `apps/mobile`. An iOS export is a bundling check,
not a signed native build or TestFlight install. The current dependency audit
is a release blocker; the September audit is historical, not current clearance.
Migration 042's waitlist/quota hardening
passes local security tests but still needs approved live deployment and verification.
See [the security review](./backlog/SECURITY-REVIEW.md) for evidence and remaining scope.
See [the iOS build runbook](./backlog/IOS-BUILD-PIPELINE.md) for verified local
preparation, exact build commands and remaining account/security gates.

Web regression tests while the PWA remains live:

```bash
npm run test:e2e          # local server, mobile WebKit + desktop Chrome
npm run test:e2e:remote   # live site at oratiotest.netlify.app
```

Authenticated E2E journeys run when `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` are exported.

## Native Beta Configuration

- Expo environment supplies `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Google Cloud billing is active for the project backing `GOOGLE_TRANSLATE_API_KEY`; `npm run qa:translation` passes with QA credentials supplied
- Apple Developer membership and EAS project are required before TestFlight, but not for Expo Go development
- Local EAS production/simulator profiles are prepared and the existing
  `@oratioglobals-team/oratio-global` project link is verified. EAS client environment
  setup, Apple enrollment and signing remain pending. Individual versus organisation
  publishing has not been decided; do not assume a registered company.
- Bundle identifier is `com.oratio.app`; version/build numbers must be set for every distributed build
- Supabase migrations applied in order before schema-dependent deploys
- Email/password is the only supported native authentication path; social sign-in providers remain disabled
- Native Sentry/PostHog must be configured and verified before external beta distribution

## Product Checks

- Logged-out users see only the native auth stack
- Public, Prayer Circle, and Private are distinct spaces in the signed-in tab bar
- Public prayers appear only in Public; circle prayers only to accepted connections; private prayers only to their owner
- Submission, detail, and "Pray for this" work without double-counting
- Profile editing, avatar upload, Settings preferences, session restoration, and sign-out work after foreground/background transitions
- Safe areas and 44pt touch targets hold on a physical iPhone
- Reporting and moderation parity (`SCRUM-71`) is complete before calling the native app V1-ready
- Light/dark/system themes (`SCRUM-80`) pass without unreadable or incomplete screens
- Prayer owner actions and sharing (`SCRUM-81`) work in every eligible prayer space
- Saved-language translation (`SCRUM-82`) behaves consistently across supported content
- Account deletion and legal/support access (`SCRUM-83`) are reachable in-app
- Map foundations `SCRUM-84`–`SCRUM-86` preserve privacy, aggregate semantics, and complete location paging

## Observability Checks

Local monitoring foundation (2026-10-08): opt-in, privacy-filtered JavaScript
error reporting is implemented for mobile, with a non-production Settings test
control. No real Sentry configuration or delivery test was performed. Native
crashes, source-map symbolication, PostHog and signed-build verification remain
open; reporting is off by default. See [native monitoring](./backlog/NATIVE-MONITORING.md).

Sentry setup (2026-10-13): `oratio-mobile` is created in the existing Oratio
organisation, assigned to `#oratio`, with an enabled high-priority email alert
routed to that team. Its public DSN is prepared in ignored local configuration;
reporting remains disabled. The web project is retained for website/admin
coverage. Actual event/alert delivery and signed-build acceptance are still open.

- Native Sentry receives a deliberate test error tagged with app version/build
- Native PostHog receives app-open and core prayer events without prayer text or personal data
- A beta issue is traceable from Sentry version/build to the matching Git commit and EAS build
- Native observability story `SCRUM-43` is complete and its alert path is verified

## Final QA Profiles

- Account A: newly created or intentionally empty profile for onboarding and empty states
- Account B: active owner with public, Circle, and private prayers plus profile history
- Account C: accepted Prayer Circle peer used to verify invitations, isolation, realtime updates, and cross-account visibility
- Run `docs/QA-CHECKLIST.md` on the latest TestFlight build, including reinstall and upgrade paths, before the App Store go/no-go decision

## Known V1 Tradeoffs

- Expo Go is suitable for development and internal checks, not the final release artifact
- Android compatibility and Google Play release work is deferred to `SCRUM-79` after the Apple App Store launch
- Multi-circle support is not implemented; the current Prayer Circle is one accepted-connection space capped by product rules
- The live PWA still contains the full legacy product until the native cutover is complete
- Custom domain and app-link configuration remain separate launch tasks
