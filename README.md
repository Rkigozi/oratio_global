# Oratio — Global Prayer Platform

Oratio connects people through shared prayer: explore prayer activity around the world, submit prayer requests, pray for others, comment and encourage, and build a private Prayer Circle.

## Status

**V1 release candidate** — deployed and monitored at https://oratiotest.netlify.app (the app's only Netlify site; a custom domain is planned after launch).

| Area | State |
| --- | --- |
| Backend | Supabase (Auth, PostgreSQL, Storage, Edge Functions, RLS) |
| Deploys | Netlify, Git-connected: every push to `main` builds and ships |
| Monitoring | Sentry (errors) + PostHog (product analytics), both live in production |
| Tests | 411 unit/component/integration tests (Vitest) + 38 E2E tests (Playwright, mobile + desktop) |
| Coverage | ~60% line coverage across the codebase |

## Quick Start

```bash
# Start the dev server (auto-cleans orphaned servers on this external drive)
./start-dev.sh

# Quality gates
npm run type-check
npm run lint
npm test
npm run build

# E2E (local server, mobile WebKit + desktop Chrome)
npx playwright install webkit   # once
npm run test:e2e

# E2E against the live Netlify site
npm run test:e2e:remote
```

Running from an external drive? `npm` can fail with an `ENOENT uv_cwd` bug — use `./start-dev.sh` (documented in `docs/QUICK-START.md`).

## Product

- **Map** — global prayer hotspots aggregated by city (never exact locations)
- **Feed** — public feed with cursor pagination, search, location and saved filters
- **Submit** — text, location, visibility (public / Prayer Circle / private), anonymous option
- **Prayer detail** — "I Prayed", comments & replies, translation, sharing, reporting
- **Prayer Circle** — private mutual connections; circle-only prayers
- **Profile** — stats, prayer library, saved/prayed lists, settings, avatar upload
- **Updates** — activity inbox (comments, replies, circle events, report outcomes)
- **Moderation** — moderator-only report review queue

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (design tokens in `src/styles/theme.css`)
- Supabase (auth, DB, storage, realtime, edge functions)
- React Leaflet, Motion, vaul (drawers)
- Sentry + PostHog
- PWA (Workbox service worker, installable, offline app shell)

## Project Structure

```
src/
├── app/
│   ├── components/        # Reusable UI (auth, comments, feed, layout, map)
│   ├── hooks/             # Auth, theme, geolocation, activity-updates contexts
│   ├── pages/             # One folder per route (auth, feed, prayer, profile, info)
│   ├── services/
│   │   ├── supabase.ts    # Client setup
│   │   ├── queries/       # Domain query modules (prayers, comments, circle, ...)
│   │   └── ...            # prayer-data, hashtags, translate, upload
│   └── routes.tsx         # Route map
├── lib/                   # Validation, analytics, monitoring, utils
├── styles/                # Tailwind entry + theme tokens
└── test/                  # Test setup + shared mocks
supabase/
├── migrations/            # 36 sequential SQL migrations (never edit applied ones)
└── functions/             # Edge functions: translate, delete-account
e2e/                       # Playwright specs + config
```

`src/app/services/supabase-queries.ts` is a barrel that re-exports the domain modules in `services/queries/` — new queries belong in the matching module.

## Workflow

- **Ship**: `git push` → CI (type-check, lint, tests, build) → Netlify auto-deploy. One pipeline, no manual steps.
- **Roll back**: Netlify deploy list → publish a previous deploy.
- **Schema changes**: add a new numbered migration in `supabase/migrations/`, never edit an applied one.

## Environment Variables

Set in Netlify (build) and GitHub Actions secrets (CI):

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anon key (safe to expose; security is via RLS) |
| `VITE_SENTRY_DSN` | Sentry error tracking |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | Product analytics |

## Docs To Read

- `docs/CODEBASE_NAVIGATION_GUIDE.md` — the mental model of the whole codebase
- `docs/V1_RELEASE_READINESS.md` — release-control checklist
- `docs/ARCHITECTURE.md` — architecture detail
- `docs/QUICK-START.md` — dev-server troubleshooting on this machine
- `.clinerules/memory-bank/` — project context for AI-assisted sessions
- `docs/archive/` — historical docs (outdated, kept for reference)

## Known Deferred Work (post-launch)

- Split remaining large UI files further (`feed.tsx` render layer, `prayer-detail.tsx`)
- Drop unused tables (`waitlist`, `push_subscriptions`, `follows`) via a new migration
- Bundle analysis: the lazy HEIC-converter chunk (~1MB) is the biggest item
- Lighthouse/performance pass, RLS security review
- Custom domain + production OAuth branding

## License

All rights reserved. Prototype for the Oratio prayer platform.
