# Oratio V1 Release Readiness

Last updated: 2026-08-31

Release-control checklist before the public V1 launch.

## Release Gates

```bash
npm run type-check
npm run lint
npm test
npm run test:coverage
npm run build
npm audit --omit=dev --audit-level=moderate
```

Browser tests:

```bash
npm run test:e2e          # local server, mobile WebKit + desktop Chrome
npm run test:e2e:remote   # live site at oratiotest.netlify.app
```

Authenticated E2E journeys run when `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` are exported.

## Production Configuration

- Netlify env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` ✅
- Deploys: Git-connected — every push to `main` builds and ships; roll back via the Netlify deploys list
- Supabase migrations applied in order before schema-dependent deploys
- Google OAuth intentionally disabled for V1 (email/password only); re-enabling requires Supabase provider setup + login/onboarding UI

## Product Checks

- Logged-out users cannot browse authenticated routes
- Public prayers appear on the public feed/map only when location is known
- Prayer Circle prayers only appear to included members; private prayers only to their owner
- Comments: add, reply, edit, delete, report all work on mobile PWA
- Avatar upload works with iPhone images (HEIC conversion)
- Light/dark/system theme persist and stay readable
- PWA launch, install icon, service-worker recovery, and refresh-after-deploy work on iPhone Safari/Chrome

## Observability Checks

- Sentry receives a deliberate test error from the deployed app
- PostHog receives page views and key product events (now enabled on Netlify builds)
- A deploy issue is diagnosable from Sentry event → GitHub commit → Netlify deploy

## Known V1 Tradeoffs

- The production build warns about large chunks; the largest is the lazy-loaded HEIC converter (~1MB) — post-launch bundle task
- Android physical-device testing deferred; mobile Chrome/WebKit is the proxy
- OG image URLs in `index.html` point to the Netlify test domain until a custom domain exists
- Multi-circle support is a post-V1 decision pending usage data
- `push_subscriptions` and `follows` tables are unused; drop them via migration 037 after launch (the `waitlist` table backs the landing beta-updates form)
