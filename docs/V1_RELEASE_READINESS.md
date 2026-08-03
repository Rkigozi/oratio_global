# Oratio V1 Release Readiness

Last updated: 2026-08-03

Use this as the release-control checklist before a public V1 deploy. The goal is not perfection; it is knowing what has been checked, what is monitored, and what is intentionally deferred.

## Release Gates

Run these from the project root before release:

```bash
npm run type-check
npm run lint
npm test
npm run test:coverage
npm run build
npm audit --omit=dev --audit-level=moderate
```

Optional browser smoke tests:

```bash
npm run test:e2e
npm run test:e2e:remote
```

`npm run test:e2e` runs against a local dev server by default. `npm run test:e2e:remote` runs against the Netlify test site.

## Production Configuration

- Netlify has `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, and `VITE_POSTHOG_KEY`.
- Supabase migrations are applied before deploys that rely on schema or RLS changes.
- Google OAuth redirect URLs include the current Supabase auth callback URL.
- The custom domain and production OAuth consent verification can wait until the domain is final.

## Product Checks

- Logged-out users cannot browse authenticated routes.
- Public prayers appear on public feed and map only when location is known.
- Prayer Circle prayers only appear to explicitly included circle members.
- Private prayers appear only in the user's private prayer list.
- Comments, comment deletion, reports, and activity updates work on mobile PWA.
- Profile avatar upload works with iPhone images, including HEIC conversion.
- Light, dark, and system theme preferences stay readable and persist.
- PWA launch, install icon, service worker recovery, and refresh after deploy work on iPhone Safari/Chrome.

## Observability Checks

- Sentry receives a deliberate test error from the deployed app.
- PostHog receives page views and key product events.
- A deploy issue can be diagnosed from Sentry event, GitHub commit, and Netlify deploy ID.

## Known V1 Tradeoffs

- The production build still warns about large chunks. The biggest one is the lazy-loaded iPhone HEIC image converter, so it should not block launch, but bundle analysis is a sensible post-V1 performance task.
- Multi-circle support is a V1-following enhancement unless product scope changes.
- Android physical-device testing is deferred; mobile Chrome can be used as a proxy for now.
- The public landing/email branding can be refined after domain and OAuth verification are complete.
