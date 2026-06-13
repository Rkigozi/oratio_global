# Active Context - Oratio Prayer Platform

## Current Phase: Production Readiness (Web PWA)

**Status**: Web PWA production-hardened. All data wired to Supabase. Ready for launch.
**Next**: Add Sentry DSN + PostHog key to `.env`, then deploy via GitHub Actions.

## What We've Done This Session

### Data Migration (Supabase)
- Feed, comments, prayers, follows, reports, profiles — all on Supabase
- Mock data removed from map, feed, detail, moderate, user profiles
- Email waitlist wired to Supabase `waitlist` table
- Profile edits persist cross-device via Supabase `profiles` table
- Map hotspots load from real Supabase prayer data (no more mockHotspots)

### Production Hardening
- OG meta tags + Twitter Card for social sharing
- Security headers on Netlify (HSTS, X-Frame-Options, etc.)
- Google Translate API key moved to Supabase Edge Function proxy
- Sentry + PostHog SDKs installed (need real DSN/key in `.env`)
- ErrorBoundary logs to Sentry
- iOS white flash fixed (`background: #0A1A3A`)
- ORATIO-branded icons (favicon + OG image, no cross)

### CI/CD
- Auto-deploy disabled — CI runs quality checks, deploy is manual only
- Manual deploy via GitHub Actions → "Deploy" workflow

### UX
- Username locked after signup (read-only in profile edit)
- Location auto-detect toggle on profile edit
- "Sample" badge on any remaining mock data
- Dead hashtag clicks fixed in PrayerRow

## Remaining for Launch
- Add Sentry DSN to `.env` for crash monitoring
- Add PostHog key to `.env` for analytics
- Run "Deploy" workflow in GitHub Actions

## Key Documents
- **Web Code**: `./src/` (current directory)
- **Native App**: `./oratio-app/` (scaffolded, not built out)
- **Memory Bank**: `.clinerules/memory-bank/`
