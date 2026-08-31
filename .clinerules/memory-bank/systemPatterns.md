# System Patterns — Oratio

## Architecture

React 19 SPA (Vite) + Supabase backend, served by Netlify as a PWA.

```
Browser (PWA)
  → Netlify (static assets, service worker)
    → Supabase (auth, PostgreSQL + RLS, storage, realtime, edge functions)
    → Sentry (errors) + PostHog (analytics)
```

## Key Patterns

### Data Layer
- `src/app/services/supabase.ts` — single browser client
- `src/app/services/queries/*.ts` — one module per domain (`prayers`, `comments`, `circle`, `updates`, `reports`, `profiles`, `saved`, `interactions`, `account`, `shared` mappers)
- `src/app/services/supabase-queries.ts` — barrel re-export; **do not add logic here**
- All queries return empty/null on error (never throw to the UI) and log via `src/lib/logger.ts`

### State
- `auth-context` — session + profile; defers Supabase on public screens for faster first paint
- `theme-context` — light/dark/system with persisted preference
- `activity-updates-context` — unread count with event/poll/realtime refresh

### Routing
- `src/app/routes.tsx` — lazy route map; `AuthGuard` protects app routes
- Public: `/landing`, `/login`, `/onboarding`, `/reset-password`, `/update-password`, `/privacy`, `/terms`
- App: `/` (map), `/feed`, `/submit`, `/prayer/:id`, `/profile/*`, `/updates`, `/moderate`, `/user/:username`

### Cross-Screen Communication
Custom window events keep screens in sync without a global store:
- `oratio-prayer-added` / `-removed` / `-updated` — submit/detail → feed
- `oratio-profile-updated` — settings → auth context
- `oratio-activity-updated` — actions → updates badge

### Supabase Discipline
- 36 sequential migrations; **applied migrations are immutable** — new behavior = new migration
- RLS on every table; public data readable, mutations owner-scoped
- Rate limiting via DB functions (`increment_prayer_count`, comment limits)

### Frontend Conventions
- Tailwind v4 with CSS-variable design tokens (`--rgb-accent` etc.) for theming
- Motion (`motion/react`) for entrance animations; `vaul` for bottom drawers
- `lucide-react` icons; `AvatarImage` fallback for missing avatars
- Error states via `LoadingSpinner` / `ErrorState`; no raw `console.error` in production paths (use `logError` → Sentry)

### Testing
- Vitest + Testing Library; tests colocated as `*.test.ts(x)`
- Shared mocks in `src/test/mocks/` (auth, supabase client, providers)
- Playwright E2E in `e2e/` with mobile (WebKit) + desktop (Chrome) projects; authenticated journeys gated behind `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`

### Performance Choices
- Manual chunks (`shell-vendor`, `supabase`, `map`, `telemetry`, `heic2any`) tuned to the PWA precache globs
- Lazy route chunks + runtime caching; HEIC converter excluded from precache (~1MB)
- Auth/telemetry deferred past first paint on public screens
