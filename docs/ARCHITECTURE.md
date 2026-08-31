# Oratio Architecture

> Current state: **V1 release candidate**
> Stack: React 19 + TypeScript + Vite + Supabase + Tailwind v4

## 1. High-Level Architecture

```
Browser (PWA, mobile-first)
  ├── Netlify CDN — static assets + Workbox service worker
  │     └── React 19 SPA (lazy-loaded routes)
  │           ├── services/queries/  — domain data modules
  │           └── hooks/             — auth, theme, updates contexts
  ├── Supabase
  │     ├── Auth (email/password)
  │     ├── PostgreSQL — 14 tables, RLS on all
  │     ├── Storage — profile avatars
  │     ├── Realtime — comments + activity events
  │     └── Edge Functions — translate, delete-account
  └── Monitoring — Sentry (errors) + PostHog EU (analytics)
```

## 2. Route Map

**Public (no app layout)**: `/landing`, `/login`, `/onboarding`, `/reset-password`, `/update-password`, `/privacy`, `/terms`

**App shell (header + bottom nav)**: `/` (map), `/feed`, `/submit`, `/profile`, `/profile/circle`, `/profile/submitted`, `/profile/prayed`, `/profile/saved`, `/profile/settings`, `/updates`, `/moderate`, `/user/:username`, `/info`, `/prayer/:id` (detail is shared-link capable: auth-gated with `?next=`)

**Fallback**: `*` → 404

## 3. Data Flow

```
Pages/Components
  → services/queries/*.ts          (domain modules; barrel: supabase-queries.ts)
    → services/supabase.ts         (single browser client)
      → Supabase PostgreSQL + RLS
Pages <—> window CustomEvents      (cross-screen sync: prayer added/removed/updated, activity-updated)
```

- Queries never throw to the UI: errors are logged (Sentry) and empty/null returned
- RLS enforces ownership; the anon key is public by design
- Realtime subscriptions refresh data; polling and focus events cover the rest

## 4. Data Model (14 tables)

`profiles` (+ `profile_username_aliases` for username changes), `prayer_requests`, `prayer_interactions`, `comments`, `saved_prayers`, `follows` (unused, to drop), `prayer_circle_connections`, `prayer_circle_invites`, `activity_events`, `reports`, `rate_limits`, `waitlist` (unused, to drop), `push_subscriptions` (unused, to drop).

36 migrations define the schema; applied migrations are immutable.

## 5. Build & Delivery

- Vite with manual chunks: `shell-vendor` (react/router), `supabase`, `map` (leaflet), `telemetry` (sentry/posthog), `heic2any`
- PWA: Workbox precaches the app shell; lazy route chunks cached at runtime; HEIC converter excluded from precache
- Deploy: Netlify Git-connected on `main`; CI gates (type-check, lint, test, build) run in GitHub Actions
- Security headers + CSP in `netlify.toml`

## 6. Testing

- Vitest + Testing Library: 411 tests, ~60% line coverage; shared mocks in `src/test/mocks/`
- Playwright: 38 E2E tests, mobile (WebKit) + desktop (Chrome) projects; authenticated journeys gated by `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`
