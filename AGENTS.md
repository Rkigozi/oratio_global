# AGENTS.md — Oratio

Guidance for AI agents working in this repo.

## What this is

Oratio is a global Christian prayer platform. Strategy: **iOS-first** — the iOS app
(Expo/React Native) is the product; the web PWA (`apps/web`) is the landing/marketing site.
Both share one Supabase backend and the `packages/shared` logic package.

## Layout

```
apps/web        React 19 + Vite PWA — landing + web presence (deploys to Netlify)
apps/mobile     Expo iOS app — the product (Expo Go for dev, TestFlight later)
packages/shared Platform-agnostic logic: prayer-data, validation, username, hashtags
supabase/       Migrations (immutable once applied) + edge functions
docs/           HLD, backlog, QA checklist, guides
```

## Commands (repo root, npm workspaces)

```bash
npm install              # once — root lockfile
./start-dev.sh           # web dev server
npm run dev:mobile       # Expo dev server (scan QR with Expo Go)
npm test                 # web suite (Vitest, 423 tests)
npm run test:mobile      # mobile suite (jest-expo)
npm run type-check       # web tsc
npm run type-check:mobile
npm run lint             # web eslint
npm run format           # prettier write-all
npm run format:check
npm run build            # web production build
npm test -- test:e2e     # see package.json scripts for e2e
```

## Conventions

- **Commits**: one logical change; message describes user-visible/structural intent
- **Tests**: colocated `*.test.ts(x)`; a behavior change requires test updates
- **Supabase**: never edit an applied migration — add a new numbered one
- **Shared logic**: platform-agnostic code lives in `packages/shared`; web keeps thin
  re-export shims at old paths; UI code stays per-app
- **Deploys**: pushing to `main` auto-deploys `apps/web` via Netlify; CI gates first
- **JIRA**: backlog lives at oratio.atlassian.net (project `SCRUM`); `docs/backlog/`
  is the sync source

## Key docs

- `docs/ARCHITECTURE.md` — high-level design
- `docs/CODEBASE_NAVIGATION_GUIDE.md` — how the code hangs together
- `docs/backlog/README.md` — agile working agreement (DoD, priorities, templates)
- `docs/QA-CHECKLIST.md` — manual QA pass
