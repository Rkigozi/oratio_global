# Oratio — Global Prayer Platform

Oratio connects people through shared prayer. The **iOS app (Expo/React Native) is the product**; this repo is a monorepo that also holds the web PWA, which becomes the landing/marketing site.

## Status

**Pivot: iOS-first.** The web PWA is live at https://oratiotest.netlify.app as the landing site; the iOS app is in development (Expo) targeting TestFlight, with Supabase as the shared backend. Tracked in the JIRA `SCRUM` project — sprint `V1 Launch` is active.

## Layout

```
apps/
├── web/                  # React 19 PWA — landing + web presence (Netlify)
└── mobile/               # iOS app (Expo) — the product (planned)
packages/
└── shared/               # Platform-agnostic logic: queries, validation, types
supabase/                 # Migrations + edge functions (shared backend)
docs/                     # HLD, backlog, QA, guides
```

## Quick Start

```bash
npm install               # once, at the repo root (npm workspaces)
./start-dev.sh            # web dev server
npm test                  # all tests (runs the web suite)
npm run type-check && npm run lint && npm run build
```

Quality: 420 unit/component/integration tests (Vitest, ~65% coverage) + 38 Playwright E2E tests (mobile + desktop). Every push: CI gates → Netlify auto-deploy from `apps/web`.

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
apps/
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/        # Reusable UI (auth, comments, feed, layout, map)
│   │   │   ├── hooks/             # Auth, theme, geolocation, activity-updates contexts
│   │   │   ├── pages/             # One folder per route (auth, feed, prayer, profile, info)
│   │   │   ├── services/
│   │   │   │   ├── supabase.ts    # Client setup
│   │   │   │   └── queries/       # Domain query modules (prayers, comments, circle, ...)
│   │   │   └── routes.tsx         # Route map
│   │   ├── lib/                   # Validation, analytics, monitoring, utils
│   │   ├── styles/                # Tailwind entry + theme tokens
│   │   └── test/                  # Test setup + shared mocks
│   ├── e2e/                       # Playwright specs + config
│   ├── public/                    # PWA icons + manifest
│   └── netlify.toml               # Build + headers + redirects
└── mobile/                        # Expo iOS app (the product — planned)
packages/
└── shared/                        # Shared logic consumed by web + mobile (planned)
supabase/
├── migrations/                    # 36 sequential SQL migrations (never edit applied ones)
└── functions/                     # Edge functions: translate, delete-account
docs/                              # HLD, backlog, QA, guides
```

`apps/web/src/app/services/supabase-queries.ts` is a barrel that re-exports the domain modules in `services/queries/` — new queries belong in the matching module. The same modules are the extraction candidates for `packages/shared`.

## Workflow

- **Ship**: `git push` → CI (type-check, lint, tests, build) → Netlify auto-deploy. One pipeline, no manual steps.
- **Roll back**: Netlify deploy list → publish a previous deploy.
- **Schema changes**: add a new numbered migration in `supabase/migrations/`, never edit an applied one.

## Environment Variables

Set in Netlify (build) and GitHub Actions secrets (CI):

| Variable                                 | Purpose                                                        |
| ---------------------------------------- | -------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                      | Supabase project URL                                           |
| `VITE_SUPABASE_ANON_KEY`                 | Public Supabase anon key (safe to expose; security is via RLS) |
| `VITE_SENTRY_DSN`                        | Sentry error tracking                                          |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | Product analytics                                              |

## Docs To Read

- `docs/CODEBASE_NAVIGATION_GUIDE.md` — the mental model of the whole codebase
- `docs/V1_RELEASE_READINESS.md` — release-control checklist
- `docs/ARCHITECTURE.md` — architecture detail
- `docs/QUICK-START.md` — dev-server troubleshooting on this machine
- `docs/specs/` + `docs/guidelines/` — product specs and testing guidelines (historical reference)
- `docs/backlog/` — agile working agreement + JIRA sync source

## Known Deferred Work (post-launch)

- Split remaining large UI files further (`feed.tsx` render layer, `prayer-detail.tsx`)
- Drop unused tables (`push_subscriptions`, `follows`) via a new migration. Note: `waitlist` IS used — the landing beta-updates form writes to it.
- Bundle analysis: the lazy HEIC-converter chunk (~1MB) is the biggest item
- Lighthouse/performance pass, RLS security review
- Custom domain + production OAuth branding

## License

All rights reserved. Prototype for the Oratio prayer platform.
