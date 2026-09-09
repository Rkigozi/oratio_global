# Active Context

## Current Focus

**iOS-first pivot.** The product is now the iOS app (Expo/React Native); the web PWA becomes the landing page. Work is tracked in JIRA (`SCRUM` project, https://oratio.atlassian.net), sprint `V1 Launch` active (2 weeks).

## In Progress

- **SCRUM-63: Monorepo restructure** — repo now uses npm workspaces: `apps/web` (moved, builds/tests/deploys unchanged), `apps/mobile` and `packages/shared` next. Netlify deploys from `apps/web`; CI gates run from the root lockfile.
- **SCRUM-64 (next): Extract shared logic** — move queries, validation, types, hashtags, prayer-data into `packages/shared`; rewire web imports; the Expo app consumes the same modules.
- **SCRUM-65 (after): Expo scaffold** — `apps/mobile` with Supabase email/password auth.

## Apple Distribution Reality

- TestFlight requires the paid Apple Developer Program ($99/yr) — not enrolled yet (SCRUM-75).
- Until then: development on the owner's iPhone via free provisioning; early demos via Expo Go.
- Xcode + TestFlight app are installed.

## Recent Changes

- Monorepo restructure (repo root now workspaces: `npm ci`/`npm test`/`npm run build` run from root)
- JIRA backlog rebuilt with agile format (epics SCRUM-31–35 + 62, stories with user-story format, GIVEN/WHEN/THEN, versions, labels)
- Sprint `V1 Launch` started with v1-launch stories

## Watch Items

- Netlify must keep deploying `apps/web` after the monorepo move (verify on next push)
- The old `oratiotest.netlify.app` domain still serves the landing until a custom domain lands
- `scripts/rebuild-backlog.py` (now in apps/web/scripts) may need to move to the repo root as a monorepo-level tool
