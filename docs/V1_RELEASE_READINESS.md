# Oratio V1 Release Readiness

Last updated: 2026-09-10

Release-control checklist for the first small-group iOS beta. Expo Go is the current development channel; TestFlight and public App Store release are later gates.

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
- Remaining parity story `SCRUM-71` is complete before calling the native app V1-ready

## Observability Checks

- Native Sentry receives a deliberate test error tagged with app version/build
- Native PostHog receives app-open and core prayer events without prayer text or personal data
- A beta issue is traceable from Sentry version/build to the matching Git commit and EAS build

## Known V1 Tradeoffs

- Expo Go is suitable for development and internal checks, not the final release artifact
- Android native QA is deferred while the product is explicitly iOS-first
- Multi-circle support is not implemented; the current Prayer Circle is one accepted-connection space capped by product rules
- The live PWA still contains the full legacy product until the native cutover is complete
- Custom domain and app-link configuration remain separate launch tasks
