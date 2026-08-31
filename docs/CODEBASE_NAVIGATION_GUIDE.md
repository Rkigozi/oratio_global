# Oratio Codebase Navigation Guide

Last updated: 2026-08-31

A plain-English map of the Oratio V1 codebase.

## Short Answer

The codebase is in a good place for a V1 release: single deploy pipeline, ~60% test coverage, domain-split data layer, monitoring live, and documentation that matches reality.

## Mental Model

The browser loads a React PWA from Netlify. React handles screens and UI state. Supabase handles auth, database reads/writes (protected by RLS), storage, and realtime. Sentry watches errors. PostHog watches product events.

1. `src/main.tsx` starts the app.
2. `src/app/App.tsx` wraps it in providers.
3. `src/app/routes.tsx` decides which page shows.
4. Pages in `src/app/pages/` render screens.
5. Components in `src/app/components/` provide reusable UI.
6. `src/app/services/queries/` talks to Supabase, one module per domain.
7. `supabase/migrations/` defines the database and security rules.

## Important Entry Points

| Area | File |
| --- | --- |
| Browser entry | `src/main.tsx` |
| App shell | `src/app/App.tsx` |
| Route map | `src/app/routes.tsx` |
| Auth guard | `src/app/components/auth/auth-guard.tsx` |
| Layout / header / bottom nav | `src/app/components/layout/` |
| Supabase client | `src/app/services/supabase.ts` |
| Data layer (barrel) | `src/app/services/supabase-queries.ts` → `services/queries/` |
| Monitoring | `src/lib/monitoring.ts` (Sentry), `src/lib/analytics.ts` (PostHog) |
| Styling tokens | `src/styles/theme.css` |

## Product Routes

Public: `/landing`, `/login`, `/onboarding`, `/reset-password`, `/update-password`, `/privacy`, `/terms`

Authenticated: `/` (map), `/feed`, `/submit`, `/prayer/:id`, `/profile`, `/profile/circle`, `/profile/submitted`, `/profile/prayed`, `/profile/saved`, `/profile/settings`, `/updates`, `/moderate`, `/user/:username`

## Core Flows → Files

| Flow | Where |
| --- | --- |
| Auth (email only) | `src/app/hooks/auth-context.tsx`, `src/app/pages/auth/` |
| Submit prayer | `src/app/pages/prayer/submit.tsx`, `src/lib/validation.ts`, `services/queries/prayers.ts` |
| Feed (data/filters) | `src/app/pages/feed/feed.tsx` + `use-feed-data.ts` / `use-feed-search.ts` |
| Feed cards | `src/app/components/feed/feed-card.tsx`, `prayer-row.tsx` |
| Map | `src/app/pages/feed/home.tsx`, `src/app/components/world-map-clean.tsx` |
| Prayer detail | `src/app/pages/prayer/prayer-detail.tsx` (+ `edit-prayer-dialog`, `report-prayer-dialog`, `prayer-circle-mini-button`) |
| Comments | `src/app/components/comments/comment-section.tsx` + `comment-thread.tsx`, `services/queries/comments.ts` |
| Prayer Circle | `src/app/pages/profile/prayer-circle.tsx`, `services/queries/circle.ts`, migrations 016/023/032 |
| Updates inbox | `src/app/pages/updates.tsx`, `src/app/hooks/activity-updates-context.tsx`, `services/queries/updates.ts` |
| Moderation | `src/app/pages/moderate.tsx`, `services/queries/reports.ts` |
| Profile/settings | `src/app/pages/profile/profile.tsx` (+ `profile-edit-drawer`), `profile-settings.tsx`, `services/queries/profiles.ts` |
| PWA | `src/main.tsx`, `src/lib/pwa-recovery.ts`, `vite.config.ts`, `netlify.toml` |

## Supabase Map

| Area | Location |
| --- | --- |
| Client | `src/app/services/supabase.ts` |
| Domain queries | `src/app/services/queries/{prayers,comments,circle,updates,reports,profiles,saved,interactions,account,shared}.ts` |
| Barrel | `src/app/services/supabase-queries.ts` (re-exports only) |
| Uploads | `src/app/services/upload.ts` |
| Migrations | `supabase/migrations/` (36, immutable once applied) |
| Edge functions | `supabase/functions/` (translate, delete-account) |

## Environment Variables

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` — set in Netlify and GitHub Actions.

## Deploys

Netlify is Git-connected to this repo: every push to `main` builds (`netlify.toml`) and deploys. GitHub Actions runs quality gates only (type-check, lint, test, build). Roll back from the Netlify deploys list.

## Quality Commands

```bash
npm run type-check
npm run lint
npm test
npm run build
npm run test:e2e          # local dev server, mobile + desktop
npm run test:e2e:remote   # live Netlify site
```

## Files A Reviewer Will Notice

- `src/app/services/queries/` — clean domain split; new queries belong in the matching module
- `src/app/pages/feed/feed.tsx` — render layer still large (~560 lines); hooks carry the logic
- `src/app/pages/prayer/prayer-detail.tsx` — feature-rich screen, split into dialogs but still the biggest page
- `src/app/pages/profile/profile.tsx` — many settings concerns; drawer extracted
- `src/app/components/world-map-clean.tsx` — Leaflet-specific rendering, now tested with a Leaflet mock

## How To Navigate A Future Change

1. Which user flow is affected?
2. Which route/page owns it?
3. Which query module reads/writes the data?
4. Does the database/RLS need a new migration?
5. Which tests should prove it (unit + Playwright journey)?
6. Does the QA checklist need a row?
