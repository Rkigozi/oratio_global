# Oratio Codebase Navigation Guide

Last updated: 2026-07-31

This guide is for a non-engineer or business analyst who needs to understand how the Oratio V1 codebase hangs together before a developer review.

## Short Answer

The codebase is in a good place for a V1 release candidate. The app is tested, deployed, monitored, and the known QA bugs are closed or deliberately deferred.

Do not do broad code cleanup right before release. The safest cleanup now is documentation, release notes, and making sure the production setup is traceable. Larger refactors should happen after V1 when there is room to test properly.

## Mental Model

Oratio is a React single-page PWA backed by Supabase.

The browser loads the React app from Netlify. The React app handles screens, navigation, forms, and UI state. Supabase handles auth, database reads/writes, storage, and row-level security. Sentry watches errors. PostHog watches product events.

Basic flow:

1. `src/main.tsx` starts the app.
2. `src/app/App.tsx` wraps the app in providers.
3. `src/app/routes.tsx` decides which page is shown.
4. Pages in `src/app/pages/` render product screens.
5. Components in `src/app/components/` provide reusable UI.
6. Services in `src/app/services/` talk to Supabase and support product logic.
7. Supabase migrations in `supabase/migrations/` define the database and security rules.

## Important Entry Points

| Area | File | What it does |
| --- | --- | --- |
| Browser entry | `src/main.tsx` | Installs PWA recovery, renders React, starts Sentry/PostHog after idle. |
| App shell | `src/app/App.tsx` | Adds auth/theme/activity providers, route tracking, service worker update checks, route preloading. |
| Route map | `src/app/routes.tsx` | Defines public and authenticated routes. |
| Auth guard | `src/app/components/auth/auth-guard.tsx` | Keeps unauthenticated users out of app routes. |
| Layout | `src/app/components/layout/layout.tsx` | Shared authenticated app layout. |
| Header | `src/app/components/layout/header.tsx` | Top nav/header. |
| Bottom nav | `src/app/components/layout/bottom-nav.tsx` | Mobile/PWA tab navigation. |
| Supabase client | `src/app/services/supabase.ts` | Creates the Supabase browser client from build-time env vars. |
| Main DB service | `src/app/services/supabase-queries.ts` | Most reads/writes for prayers, profiles, comments, reports, updates, and circle features. |
| Monitoring | `src/lib/monitoring.ts` | Sentry setup and exception capture. |
| Analytics | `src/lib/analytics.ts` | PostHog setup and event capture. |
| Styling | `src/styles/theme.css` | Core theme variables for light/dark mode. |

## Product Routes

Public routes:

| Route | Screen |
| --- | --- |
| `/landing` | Logged-out landing page. |
| `/login` | Sign in. |
| `/onboarding` | Sign up / first entry. |
| `/reset-password` | Request password reset email. |
| `/update-password` | Set new password after reset link. |
| `/privacy` | Privacy page. |
| `/terms` | Terms page. |

Authenticated routes:

| Route | Screen |
| --- | --- |
| `/` | Map/home screen. |
| `/feed` | Public prayer feed. |
| `/submit` | Submit a prayer. |
| `/prayer/:id` | Prayer detail, pray button, comments, reports. |
| `/profile` | User profile overview. |
| `/profile/circle` | Prayer Circle experience. |
| `/profile/submitted` | User's submitted prayers. |
| `/profile/prayed` | Prayers the user has prayed for. |
| `/profile/saved` | Saved prayers. |
| `/profile/settings` | Profile, avatar, location, theme settings. |
| `/updates` | Activity updates inbox. |
| `/moderate` | Moderator report review. |

## Core Product Flows

### Authentication

Start with:

- `src/app/hooks/auth-context.tsx`
- `src/app/components/auth/auth-guard.tsx`
- `src/app/pages/auth/login.tsx`
- `src/app/pages/auth/onboarding.tsx`
- `src/app/pages/auth/reset-password.tsx`
- `src/app/pages/auth/update-password.tsx`

Supabase Auth handles email/password and Google OAuth. The app stores the current session in React context and protects private routes through `AuthGuard`.

### Prayer Submission

Start with:

- `src/app/pages/prayer/submit.tsx`
- `src/lib/validation.ts`
- `src/app/services/supabase-queries.ts`

The submit screen validates text/location, writes the prayer to Supabase, and then routes users toward feed/detail experiences.

### Feed

Start with:

- `src/app/pages/feed/feed.tsx`
- `src/app/components/feed/feed-card.tsx`
- `src/app/components/feed/prayer-row.tsx`
- `src/app/services/supabase-queries.ts`

The feed shows prayer requests, filters/searches them, supports saving/praying, and now restores scroll position after opening a prayer detail.

### Map

Start with:

- `src/app/pages/feed/home.tsx`
- `src/app/components/world-map-clean.tsx`
- `src/app/services/supabase-queries.ts`

The map aggregates prayers by known location. Unknown locations should not show as map hotspots.

### Prayer Detail, Comments, And Reports

Start with:

- `src/app/pages/prayer/prayer-detail.tsx`
- `src/app/components/comments/comment-section.tsx`
- `src/app/pages/prayer/report-status-title.ts`
- `src/app/services/supabase-queries.ts`

This is where users pray, comment, report content, and see report feedback.

### Prayer Circle

Start with:

- `src/app/pages/profile/prayer-circle.tsx`
- `src/app/services/supabase-queries.ts`
- `supabase/migrations/016_prayer_circle.sql`
- `supabase/migrations/023_prayer_audience.sql`

Prayer Circle is the private/mutual connection experience. Users request connection; the other person accepts or rejects.

### Updates

Start with:

- `src/app/pages/updates.tsx`
- `src/app/hooks/activity-updates-context.tsx`
- `supabase/migrations/027_activity_updates.sql`
- `supabase/migrations/028_enable_activity_events_realtime.sql`
- `supabase/migrations/031_allow_activity_event_delete.sql`

Updates are the in-app activity inbox: comments, replies, Prayer Circle events, reports, and similar product notifications.

### Profile, Avatar, Theme, Location

Start with:

- `src/app/pages/profile/profile.tsx`
- `src/app/pages/profile/profile-settings.tsx`
- `src/app/services/upload.ts`
- `src/app/hooks/theme-context.tsx`
- `src/app/hooks/use-geolocation.ts`

Profile settings own display name, bio, avatar upload, location preference, and theme preference.

### PWA And Mobile Behavior

Start with:

- `src/main.tsx`
- `src/app/App.tsx`
- `src/lib/pwa-recovery.ts`
- `vite.config.ts`
- `public/manifest.webmanifest`
- `public/icons/`
- `netlify.toml`

This is where service worker recovery, install icons, cache headers, and mobile safe-area behavior come together.

## Supabase Map

Main places to understand:

| Area | Location |
| --- | --- |
| Client setup | `src/app/services/supabase.ts` |
| App queries | `src/app/services/supabase-queries.ts` |
| File uploads | `src/app/services/upload.ts` |
| Database history | `supabase/migrations/` |
| Edge functions | `supabase/functions/` |

Important point: once a migration has been applied to production, do not edit old migration files as the way to change production behavior. Add a new migration instead.

## Environment Variables

These are expected at build/deploy time:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anon key used by the browser client. |
| `VITE_SENTRY_DSN` | Sentry browser error tracking DSN. |
| `VITE_POSTHOG_KEY` | PostHog project key. |
| `VITE_POSTHOG_HOST` | Optional PostHog host, defaults to EU host in code. |

The Supabase anon key is meant to be public. Security is enforced by Supabase Row Level Security policies, not by hiding the anon key.

## Quality Commands

Run these before a release or before asking for review:

```bash
npm run type-check
npm run lint
npm test
npm run build
```

Optional deeper checks:

```bash
npm run test:e2e
npm run test:coverage
```

The app is also checked in GitHub Actions on `main` and pull requests.

## Files A Reviewer Will Probably Notice

These are not necessarily "bad", but they are likely review discussion points:

| File | Why it stands out |
| --- | --- |
| `src/app/services/supabase-queries.ts` | Large file with many database operations. Good candidate for post-V1 splitting by domain. |
| `src/app/pages/feed/feed.tsx` | Large route component with feed state, filtering, scrolling, and navigation behavior. |
| `src/app/components/comments/comment-section.tsx` | Complex interactive component: comments, replies, editing, deletion, reporting. |
| `src/app/pages/profile/profile-settings.tsx` | Handles several settings concerns in one screen. |
| `src/app/components/world-map-clean.tsx` | Map rendering is naturally specialized and deserves careful testing. |

This is normal for a fast V1, especially one built with AI assistance. The key is that these files now have targeted tests around important behavior.

## Cleanup Advice

### Safe To Do Now

These are low risk before V1:

- Keep the QA sheet updated.
- Keep this guide current.
- Add short reviewer notes for deferred admin work: custom domain, Google verification, branded SMTP.
- Prefer GitHub-backed Netlify deploys for future traceability.
- Do not start large refactors unless a bug requires them.

### Better After V1

These are worthwhile but should wait until there is breathing room:

- Split `supabase-queries.ts` into domain modules, for example prayers, comments, profiles, reports, updates, prayer circle.
- Split `feed.tsx` into hooks/components for feed data, filters, scroll restore, and render.
- Split `comment-section.tsx` into smaller components for comment item, reply editor, report modal, and delete/edit controls.
- Run a dedicated RLS/security review of every Supabase table and policy.
- Run Lighthouse/performance work on the production app.
- Tighten deploy traceability so production deploys come from GitHub commit builds only.
- Refresh older docs that still mention old counts or old architecture.

### Do Not Do Right Before Release

- Do not rewrite auth.
- Do not rewrite Supabase query structure.
- Do not change old applied migrations.
- Do not upgrade major dependencies.
- Do not redesign core navigation.
- Do not add new social features.

## How To Navigate A Future Change

When someone suggests a product change, ask:

1. Which user flow is affected?
2. Which route/page owns that flow?
3. Which service function reads or writes the data?
4. Does the database/RLS need a migration?
5. Which tests should prove it works?
6. Does the QA sheet need a new test row?

Example:

"Users should be able to delete updates."

- Screen: `src/app/pages/updates.tsx`
- Data layer: `src/app/services/supabase-queries.ts`
- State provider: `src/app/hooks/activity-updates-context.tsx`
- Database/RLS: `supabase/migrations/031_allow_activity_event_delete.sql`
- Tests: `src/app/pages/updates.test.tsx`
- QA: updates/bell/delete test row

## How To Talk About The Codebase In A Review

Useful framing:

"This is an AI-assisted V1 that has been hardened through QA, tests, Supabase RLS, monitoring, and production deployment. The main technical debt is not broken behavior; it is mostly file size, domain separation, performance scaling, and post-V1 production admin polish."

That is an honest and defensible position.
