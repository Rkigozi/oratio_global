# Oratio — Global Prayer Platform

Oratio connects people through shared prayer. The **iOS app (Expo/React Native) is the product**; this repo is a monorepo that also holds the web PWA, which becomes the landing/marketing site.

## Status

**iOS-first migration in progress.** The Expo app now covers authentication and the core prayer journey in Expo Go. The existing web PWA remains live at https://oratiotest.netlify.app while it is reduced to the landing/web presence. TestFlight distribution is deliberately deferred until the first native beta is feature-complete and the Apple Developer membership is active.

## Layout

```
apps/
├── web/                  # React 19 PWA — landing + web presence (Netlify)
└── mobile/               # Expo/React Native iOS app — the product
packages/
└── shared/               # Platform-agnostic logic: queries, validation, types
supabase/                 # Migrations + edge functions (shared backend)
docs/                     # HLD, backlog, QA, guides
```

## Quick Start

```bash
npm install               # once, at the repo root (npm workspaces)
./start-dev.sh            # web dev server
npm run dev:mobile        # Expo dev server; scan the QR code with Expo Go
npm test                  # web tests
npm run test:mobile       # native tests
npm run type-check && npm run type-check:mobile
npm run lint && npm run build
```

Current automated baseline: 423 web tests and 34 native tests, plus the existing Playwright web journeys. Pushing `main` deploys `apps/web` to Netlify; it does not distribute a native build.

## Product

Native today:

- Email/password authentication and session restoration
- Public, Map, Prayer Circle, and Private prayer spaces
- Prayer submission with public/circle/private visibility and public anonymity
- Prayer detail, "Pray for this" interactions, comments/replies, and private Notes
- Prayer Circle invitations, management, and live in-app Updates
- Profile editing, avatar upload, Settings preferences, and sign-out
- Global prayer hotspots with location-specific public prayer lists

Still to port before the native V1 beta: prayer edit/delete, native sharing, reporting/moderation, observability, and complete light/dark/system theming.

## Stack

- Expo 57 + React Native 0.86 + React Navigation
- React 19 + TypeScript + Vite for the web presence
- Tailwind CSS v4 in `apps/web`
- Supabase (auth, DB, storage, realtime, edge functions)
- Sentry + PostHog on the web; native observability is still to be wired

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
└── mobile/
    ├── App.tsx                    # providers + navigation root
    └── src/
        ├── navigation/            # auth stack + signed-in bottom tabs
        ├── screens/               # native product screens
        ├── hooks/                 # auth and feed state
        └── services/supabase.ts   # native Supabase client registration
packages/
└── shared/                        # Queries, validation, types used by both apps
supabase/
├── migrations/                    # 37 sequential SQL migrations (never edit applied ones)
└── functions/                     # Edge functions: translate, delete-account
docs/                              # HLD, backlog, QA, guides
```

New platform-neutral queries and validation belong in `packages/shared`; app folders should retain UI and platform integration only. The web service files are thin compatibility re-exports while the native migration is underway.

## Workflow

- **Web**: `git push` → CI → Netlify auto-deploy. Roll back from the Netlify deploy list.
- **Native development**: `npm run dev:mobile` → Expo Go. This is development distribution, not a release.
- **Native beta (later)**: EAS build → TestFlight → invited testers.
- **Schema changes**: add a new numbered migration in `supabase/migrations/`, never edit an applied one.

## Environment Variables

Set in Netlify (build) and GitHub Actions secrets (CI):

| Variable                                 | Purpose                                                        |
| ---------------------------------------- | -------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                      | Supabase project URL                                           |
| `VITE_SUPABASE_ANON_KEY`                 | Public Supabase anon key (safe to expose; security is via RLS) |
| `VITE_SENTRY_DSN`                        | Sentry error tracking                                          |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | Product analytics                                              |

Native development uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the local environment. These are public client credentials; authorization is enforced by Supabase RLS.

## Docs To Read

- `docs/CODEBASE_NAVIGATION_GUIDE.md` — the mental model of the whole codebase
- `docs/V1_RELEASE_READINESS.md` — release-control checklist
- `docs/ARCHITECTURE.md` — architecture detail
- `docs/QUICK-START.md` — dev-server troubleshooting on this machine
- `docs/specs/` + `docs/guidelines/` — product specs and testing guidelines (historical reference)
- `docs/backlog/` — agile working agreement + JIRA sync source

## Known Deferred Work (post-launch)

- Complete native feature parity needed for the beta journey
- Add native Sentry/PostHog and EAS/TestFlight configuration
- Reduce `apps/web` to landing, policy, and support pages after native cutover
- Drop unused tables (`push_subscriptions`, `follows`) only through a future migration; `waitlist` backs the landing beta-updates form
- Custom domain and production app-link configuration

## License

All rights reserved. Prototype for the Oratio prayer platform.
