# Progress — Oratio

## Completed

### v0.1 — Prototype
- ✅ World map, feed, submit, "I Prayed", profile — full product loop
- ✅ PWA (manifest, service worker, installable, offline shell)

### v0.2 — Backend integration
- ✅ Supabase: auth (email), database + RLS, storage (avatars), realtime (comments, activity)
- ✅ Feed cursor pagination, comment pagination, saved prayers (cross-device)
- ✅ Prayer Circle (invites, acceptance, circle-only prayers)
- ✅ Updates inbox + header unread badge
- ✅ Reporting + moderator review queue
- ✅ Rate limiting (10 prayers/hr, 30 comments/hr)
- ✅ Privacy: city/country only, approximate coordinates

### v0.3 — Hardening
- ✅ Sentry + PostHog live in production (PostHog key added to Netlify Aug 2026)
- ✅ CI quality gates on every push; Netlify Git-connected deploys (single pipeline)
- ✅ 411 unit/component/integration tests, ~60% coverage
- ✅ Playwright E2E: 38 tests across mobile WebKit + desktop Chrome
- ✅ Domain-module split of the Supabase data layer; UI file splits
- ✅ Docs refresh + archive of stale docs
- ✅ Google OAuth removed (V1 ships email/password only)

## Deferred (post-launch)

- Drop unused tables (`push_subscriptions`, `follows`) — migration 037
- Bundle analysis and Lighthouse pass (biggest chunk: HEIC converter)
- RLS security review
- Custom domain; production OAuth branding if Google sign-in returns
- Further UI splits (`feed.tsx` render layer, `prayer-detail.tsx`)

## What Works Best

- Single push → deploy loop
- Tests as the safety net for refactors (every split in Aug 2026 landed green)
- Migration discipline: 36 applied migrations, never edited
