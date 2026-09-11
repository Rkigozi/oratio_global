# Oratio Architecture

> Current state: **iOS-first migration; Expo Go development build**
> Product stack: Expo 57 + React Native 0.86 + React Navigation + Supabase

## 1. High-Level Architecture

```
Expo iOS app (primary product)
  ├── React Navigation — auth stack + signed-in bottom tabs
  ├── Native screens/hooks
  └── packages/shared — queries, types, validation

Web presence (temporary full PWA during migration)
  ├── Netlify CDN + React/Vite
  └── packages/shared — same backend contracts

Supabase (shared backend)
  ├── Auth (email/password)
  ├── PostgreSQL — RLS-protected product data
  ├── Storage — profile avatars
  ├── Realtime — comments + activity events
  └── Edge Functions — translate, delete-account
```

The clients are untrusted. Supabase row-level security remains the final authorization boundary for public, circle, and private data.

## 2. Native Navigation

**Logged out stack**: Login, Sign Up, Reset Password

**Signed-in tabs**: Public, Map, Prayer Circle, Private, Me

**Signed-in stack screens**: Submit, Prayer Detail, Location Prayers, Prayer Circle Management, Profile, Settings, Updates

The native Public feed has All/Saved/Country filters and server-side text/location/category search backed by the shared feed query. Trending hashtags are derived from the currently loaded feed and open the same search path. The map renders public prayer hotspots through `react-native-maps`. Selecting a hotspot shows the aggregated request and distinct-people-prayed totals, then drills into its public prayers. Native Prayer Circle management reuses the shared consent-based invite/connection queries and the database-enforced 12-person limit. Prayer detail supports save/unsave, realtime comments, single-level replies, and owner-only private Notes through the shared RLS-protected query modules. Native Profile lives in the Me tab; Settings remains a profile-launched stack screen. Profile and Settings reuse the shared profile/preference queries and upload avatars to Supabase Storage through Expo Image Picker. The native Updates provider keeps a live badge on the Public header bell through Supabase Realtime, foreground refresh, and 30-second active polling; the stack inbox routes activity back to prayers or Circle management. Moderation and the remaining prayer-detail actions are migration work, not hidden native routes.

## 3. Web Route Map

**Public (no app layout)**: `/landing`, `/login`, `/onboarding`, `/reset-password`, `/update-password`, `/privacy`, `/terms`

**App shell (header + bottom nav)**: `/` (map), `/feed`, `/submit`, `/profile`, `/profile/circle`, `/profile/submitted`, `/profile/prayed`, `/profile/saved`, `/profile/settings`, `/updates`, `/moderate`, `/user/:username`, `/info`, `/prayer/:id` (detail is shared-link capable: auth-gated with `?next=`)

**Fallback**: `*` → 404

The existing authenticated web routes remain available during migration. Long term, `apps/web` will retain landing, auth hand-off, privacy, terms, and support/web presence rather than acting as the primary product.

## 4. Data Flow

```
Native/Web UI
  → packages/shared/src/queries/   (platform-neutral domain operations)
    → registered Supabase client   (one per app runtime)
      → Supabase PostgreSQL + RLS
```

- Each app registers its Supabase client before importing shared queries
- Shared code contains no DOM or React Native UI dependencies
- RLS enforces ownership; the anon key is public by design
- Mobile screens reload on focus and support pull-to-refresh; realtime will be introduced where live state materially improves the journey

## 5. Data Model

`profiles` (+ `profile_username_aliases` for username changes), `prayer_requests`, `prayer_interactions`, `comments`, `saved_prayers`, `follows` (unused, to drop), `prayer_circle_connections`, `prayer_circle_invites`, `activity_events`, `reports`, `rate_limits`, `waitlist` (landing beta-updates form), `push_subscriptions` (unused, to drop).

38 migrations define the schema; applied migrations are immutable. Migration 037 makes `prayer_interactions` the source of truth for prayer totals, reconciles existing totals, and prevents clients from calling count-mutating RPCs directly. Migration 038 canonicalises stored prayer locations and indexes public location drill-down.

## 6. Build & Delivery

- Development: Expo Go via `npm run dev:mobile`
- Native beta: EAS/TestFlight is deferred until the beta feature set and Apple membership are ready
- Web: Vite/Workbox build deployed by Netlify from `main`
- Database: migrations are applied independently and must precede clients that depend on them
- CI should gate both app type-checks/tests plus the web lint/build before release branches are distributed

## 7. Testing

- Native: Jest + React Native Testing Library, currently 57 tests
- Web/shared regression suite: Vitest, currently 423 tests
- Web E2E: Playwright mobile WebKit + desktop Chrome projects
- Manual native QA: physical iPhone in Expo Go until TestFlight begins
