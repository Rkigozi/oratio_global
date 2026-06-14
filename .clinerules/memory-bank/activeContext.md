# Active Context - Oratio Prayer Platform

## Current Phase: Production Readiness (Web PWA)

**Status**: Web PWA production-hardened. All data wired to Supabase. Loading/error states on all pages. Dead schema cleaned.

## What We've Done This Session (2026-06-14)

### Production Hardening
- **Loading states**: Added `LoadingSpinner` + `ErrorState` components to feed, prayer-detail, profile-saved, profile-submitted, profile-prayed
- **Error handling**: All data-fetching pages show error + retry button on Supabase failures
- **Sentry logging**: `logError()` utility sends to Sentry in production, replaces 27 `console.error` calls in `supabase-queries.ts`
- **Saved prayers**: New `saved_prayers` table + migration, front-end wired to persist cross-device
- **Prayer detail**: Save/follow actions now persist to Supabase (not just localStorage)
- **Profile pages**: submitted, prayed, saved all query Supabase as primary source (localStorage fallback)

### Schema Cleanup
- Removed dead columns: `tags`, `is_answered`, `answered_at` from `prayer_requests`
- Removed dead table: `push_subscriptions` (no push infra exists)
- Removed dead column: `language_preference` from `profiles`
- Removed dead function: `subscribe_to_waitlist()` (frontend uses direct INSERT)
- Removed `tags` from `PrayerRequest` type and all Supabase SELECT queries
- Removed `TAGS_BY_CATEGORY`/`ALL_TAGS` constants (only used in deleted mock data)
- Removed unused `cities` export from `prayer-data.ts`
- Migration: `008_schema_cleanup.sql`

### Documentation
- README updated to reflect Supabase backend, v0.2 phase, current known issues

## Remaining for Launch
- Add Sentry DSN to `.env` for crash monitoring
- Add PostHog key to `.env` for analytics
- Split `feed.tsx` (785 lines) into smaller components
- Split `supabase-queries.ts` (700+ lines) by domain
- Fix 74 pre-existing lint warnings (floating promises)

## Key Documents
- **Web Code**: `./src/` (current directory)
- **Native App**: `./oratio-app/` (scaffolded, not built out)
- **Memory Bank**: `.clinerules/memory-bank/`
