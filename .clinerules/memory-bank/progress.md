# Progress - Oratio Prayer Platform

## Current Status
**Phase:** Sprint D — Launch Readiness
**Last milestone:** Sprints A, B, C complete
**Next milestone:** CI/CD, Sentry, Analytics, A11y audit, Launch collateral
**Deployed:** Yes (Netlify, auto-deploy from main)
**Repo:** github.com/Rkigozi/oratio_global.git
**Tests:** 27 passing (vitest)

## Sprint A — Foundation (✅ Done)
- [x] Supabase project + schema (8 tables, RLS, triggers, auto-profile)
- [x] REST API layer (src/lib/api.ts)
- [x] Auth: email/password + Google OAuth (removed username-based login)
- [x] PWA manifest + icons
- [x] Service worker (workbox caching)
- [x] Landing page scroll freeze fix (iPhone 15)

## Sprint B — Core Loop + Comments (✅ Done)
- [x] Comments (Reddit-style threaded replies)
- [x] Comment moderation (report flow)
- [x] Code splitting (lazy routes, 295KB → 153KB initial)
- [x] Contrast fix (time labels #3e4460 → #6b7499)
- [x] Push notifications removed (no tester demand)

## Sprint C — Discovery + Polish (✅ Done)
- [x] Search bar (Enter-to-search, recent searches, delete)
- [x] Hashtag system (inline #tags, clickable, trending)
- [x] Map refresh (ESRI Light Gray tiles, country borders, gold markers)
- [x] Translation (Google Cloud Translation API)
- [x] Shareable link (submit success + prayer detail page)
- [x] Save button (moved to detail page three-dot menu)
- [x] Install prompt (Info page, iOS/Android steps)
- [x] Geolocation (Near Me in feed, locate button on map)
- [x] Country filter + filter pill redesign
- [x] Multi-language mock data (ES, FR, PT, DE, IT)
- [x] City removed from feed cards

## Sprint D — Launch Readiness (⬜ Planned)
- [ ] CI/CD pipeline (GitHub Actions → Netlify)
- [ ] Error monitoring (Sentry)
- [ ] Analytics (PostHog)
- [ ] Accessibility audit
- [ ] Church launch collateral (install flyer, demo script)
- [ ] Clean up profile-data.ts localStorage functions
- [ ] Remove unused code/imports

## JIRA Backlog
All Sprint A, B, C stories closed as Done in JIRA.
Sprint D stories: KAN-31 (Testing), KAN-32 (Release), KAN-54 (A11y), KAN-56 (Analytics), KAN-57 (CI/CD), KAN-58 (Tests), KAN-60 (Critical path tests), KAN-62 (Sentry), KAN-95 (Landing), KAN-96 (Collateral)

---
*Last Updated: 2026-06-11*
*Next: Sprint D — Launch Readiness*
