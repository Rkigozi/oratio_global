# Progress - Oratio Prayer Platform

## Current Status
**Phase:** Sprint D — Launch Readiness (almost complete)
**Last milestone:** Web PWA production-hardened, all data on Supabase
**Next milestone:** Add Sentry/PostHog keys, deploy
**Deployed:** Yes (Netlify, manual deploy via GitHub Actions)
**Repo:** github.com/Rkigozi/oratio_global.git
**Tests:** 50 passing (vitest)

## Sprint A — Foundation (✅ Done)
- [x] Supabase project + schema (8 tables, RLS, triggers, auto-profile)
- [x] REST API layer migrated to Supabase queries
- [x] Auth: email/password + Google OAuth (removed username-based login)
- [x] PWA manifest + branded ORATIO icons
- [x] Service worker (workbox caching)
- [x] Landing page scroll freeze fix (iPhone 15)

## Sprint B — Core Loop + Comments (✅ Done)
- [x] Comments (Reddit-style threaded, wired to Supabase)
- [x] Comment moderation (report flow, wired to Supabase)
- [x] Code splitting (lazy routes, minimized initial bundle)
- [x] Contrast fix (time labels)
- [x] Push notifications removed (no tester demand)

## Sprint C — Discovery + Polish (✅ Done)
- [x] Search bar + user search (via Supabase `searchUsers`)
- [x] Hashtag system (inline #tags, clickable in FeedCard + PrayerRow)
- [x] Map with real Supabase prayer hotspots
- [x] Translation (Google Cloud via Supabase Edge Function proxy — key is server-side)
- [x] Shareable link + save button
- [x] Geolocation (Near Me, profile auto-detect, submit auto-detect)
- [x] Country filter + trending hashtags
- [x] Location auto-detect toggle on profile + submit

## Sprint D — Launch Readiness (✅ Done)
- [x] CI/CD split: auto-checks on push, manual deploy via workflow_dispatch
- [x] Error monitoring (Sentry SDK installed, needs DSN in .env)
- [x] Analytics (PostHog SDK installed, needs key in .env)
- [x] Security headers (HSTS, X-Frame-Options, CSP, etc.)
- [x] OG meta tags + Twitter Card for social sharing
- [x] ORATIO-branded favicon + OG image
- [x] All data wired to Supabase (feed, comments, prayers, follows, reports, profiles, map)
- [x] Mock data removed from main flows
- [x] Username locked after signup
- [x] Profile edits persist cross-device
- [x] Email waitlist wired to Supabase
- [x] iOS splash screen / white flash fix
- [x] Unused code/imports cleaned up

## Remaining
- [ ] Add Sentry DSN to `.env` (user needs to provide)
- [ ] Add PostHog key to `.env` (user needs to provide)
- [ ] Manual deploy via GitHub Actions when ready
- [ ] Native app development (oratio-app/) — separate phase

---
*Last Updated: 2026-06-13*
*Next: Sentry/PostHog keys → Deploy*
