# Progress - Oratio Prayer Platform

## Current Status
**Phase:** Sprint D — Launch Readiness (almost complete)
**Last milestone:** Loading/error states, schema cleanup, Saved prayers to Supabase
**Next milestone:** Split large files, fix lint warnings
**Deployed:** Yes (Netlify, manual deploy via GitHub Actions)
**Repo:** github.com/Rkigozi/oratio_global.git
**Tests:** 50 passing (vitest)

## Sprint A — Foundation (✅ Done)
- [x] Supabase project + schema (7 tables + storage, RLS, triggers, auto-profile)
- [x] REST API layer migrated to Supabase queries
- [x] Auth: email/password + Google OAuth
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
- [x] Translation (Google Cloud via Supabase Edge Function proxy)
- [x] Shareable link + save button
- [x] Geolocation (Near Me, profile auto-detect, submit auto-detect)
- [x] Country filter + trending hashtags
- [x] Location auto-detect toggle on profile + submit

## Sprint D — Launch Readiness (✅ Done)
- [x] CI/CD split: auto-checks on push, manual deploy via workflow_dispatch
- [x] Error monitoring (Sentry SDK installed + `logError()` utility)
- [x] Analytics (PostHog SDK installed)
- [x] Security headers (HSTS, X-Frame-Options, CSP, etc.)
- [x] OG meta tags + Twitter Card for social sharing
- [x] ORATIO-branded favicon + OG image
- [x] All data wired to Supabase (feed, comments, prayers, follows, reports, profiles, map, saved)
- [x] Mock data removed from main flows
- [x] Username locked after signup
- [x] Profile edits persist cross-device
- [x] Email waitlist wired to Supabase
- [x] iOS splash screen / white flash fix
- [x] Loading states + error states on all data-fetching pages
- [x] Dead schema elements cleaned (tags, is_answered, push_subscriptions, language_preference)
- [x] Unused code/imports cleaned up
- [x] Saved prayers table + cross-device persistence

## Remaining for v1.0
- [ ] Add Sentry DSN + PostHog key to `.env` (user needs to provide)
- [ ] Split `feed.tsx` (785 lines) into smaller components
- [ ] Split `supabase-queries.ts` (700+ lines) by domain
- [ ] Fix 74 pre-existing lint warnings (floating promises, etc.)
- [ ] Native app development (oratio-app/) — separate phase

---
*Last Updated: 2026-06-14*
*Next: Split large files, fix lint warnings*
