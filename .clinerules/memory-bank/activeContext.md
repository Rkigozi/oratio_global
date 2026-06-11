# Active Context - Oratio Prayer Platform

## Current Phase: Sprint D — Launch Readiness

**Status**: Sprints A, B, C complete. All stories closed in JIRA.
**Next**: CI/CD, Sentry, Analytics, A11y audit, Launch collateral

## What's Built (v1.0 Candidate)

### Core Features
- Landing → Sign-up/Login (email/Google) → Map → Feed → Submit → Profile
- Interactive world map (ESRI Light Gray tiles, country borders, gold markers)
- Prayer feed with search, hashtags, country filter, Near Me, infinite scroll
- Prayer submission (text, anonymous toggle, #hashtags)
- "I Prayed" interaction (pray/unpray with count)
- Threaded comments (Reddit-style with reply toggle)
- User profiles with photo upload, stats, activity views
- Crisis resources on submit page
- Report + moderation inbox
- PWA manifest + service worker
- Translation (Google Cloud API)
- Shareable prayer links
- Geolocation "Near Me" + locate on map

### Auth
- Supabase Auth (email/password + Google OAuth)
- Auto-profile creation on sign-up (DB trigger)
- No more username-based localStorage login

### Tech Stack
React 19, TypeScript 6, Vite 6, Tailwind CSS 4, React Router 7,
Supabase, Leaflet, Motion, Lucide, Zod, Vaul, Vitest

### Testing
27 passing tests (hashtag extraction, validation, mock data integrity)

## Active Decisions

### Translation
Google Cloud Translation API live. Hardcoded target language detection (English ↔ Spanish based on text analysis). Swap to `getUserLanguage()` for production.

### Push Notifications
Removed entirely. Zero testers requested it. Service worker still handles caching.

### Location on Cards
Removed city from feed cards (like Instagram/Twitter). Country filter + Near Me still work. Location kept on prayer detail page.

### Hashtags vs Categories
Broad categories removed. Replaced with organic #hashtags in prayer text. Trending hashtags in feed header. Clickable to filter.

## Documents
- **Requirements**: `project_scope/v1.0-requirements.md`
- **JIRA Backlog (local)**: `project-management/jira-backlog/epics-and-versions.md`
- **Memory Bank**: `.clinerules/memory-bank/`

---
*Last Updated: 2026-06-11*
*Next: Sprint D — Launch Readiness*
