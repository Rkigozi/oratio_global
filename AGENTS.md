# AGENTS.md — Oratio

Guidance for AI agents working in this repo.

## What this is

Oratio is a global Christian prayer platform. Strategy: **iOS-first** — the iOS app
(Expo/React Native) is the product. `apps/web` supports the product with public
information, auth/link handoffs and protected admin tools; its public-site conversion
is a planned release workstream, not a second product roadmap. Both share Supabase and `packages/shared`.
Finish mobile implementation and Expo Go QA before TestFlight; Apple membership
and signed distribution are subsequent release prerequisites. Start documentation at
`docs/README.md` and follow `docs/V1_RELEASE_READINESS.md` for delivery order.

## Layout

```
apps/web        React 19 + Vite — supporting website/admin services (Netlify)
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
npm test                 # web/shared suite (Vitest)
npm run test:mobile      # mobile suite (jest-expo)
npm run type-check       # web tsc
npm run type-check:mobile
npm run lint             # web eslint
npm run format           # prettier write-all
npm run format:check
npm run build            # web production build
npm run test:e2e          # supporting-web Playwright journeys
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
- **Documentation**: follow `docs/guidelines/DOCUMENTATION.md`; write for engineering
  contributors, preserve evidence provenance and exclude personal conversational context

## Key docs

- `docs/ARCHITECTURE.md` — high-level design
- `docs/CODEBASE_NAVIGATION_GUIDE.md` — source navigation
- `docs/backlog/README.md` — agile working agreement (DoD, priorities, templates)
- `docs/QA-CHECKLIST.md` — manual QA pass
