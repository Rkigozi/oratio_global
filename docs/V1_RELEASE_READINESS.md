# Oratio V1 Release Readiness

Last updated: 2026-09-12

Release-control checklist for the first small-group iOS beta and first public
Apple App Store release. Expo Go is the current development channel; TestFlight
is the release-candidate channel. Android follows later under `SCRUM-79` and is
not a dependency of V1.

## Release Gates

```bash
npm run type-check
npm run type-check:mobile
npm run lint
npm test
npm run test:mobile
npm run test:coverage
npm run build
npm audit --omit=dev --audit-level=moderate
npx expo-doctor
npx expo export --platform ios
```

Web regression tests while the PWA remains live:

```bash
npm run test:e2e          # local server, mobile WebKit + desktop Chrome
npm run test:e2e:remote   # live site at oratiotest.netlify.app
```

Authenticated E2E journeys run when `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` are exported.

## Native Beta Configuration

- Expo environment supplies `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Apple Developer membership and EAS project are required before TestFlight, but not for Expo Go development
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
