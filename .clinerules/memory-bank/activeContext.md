# Active Context

## Current Focus

**iOS-first pivot.** The product is now the iOS app (Expo/React Native); the web PWA becomes the landing page. Work is tracked in JIRA (`SCRUM` project, https://oratio.atlassian.net), sprint `V1 Launch` active (2 weeks).

## In Progress

- **SCRUM-63: Monorepo restructure** — DONE (in JIRA: In Review — the workflow has no Done status). npm workspaces live: `apps/web` + `apps/mobile`, root lockfile, Netlify deploys `apps/web`.
- **SCRUM-65: Expo scaffold** — DONE. `apps/mobile` (Expo SDK 57, slug `oratio`, bundle id `com.oratio.app`, owner `oratio_global`) runs on a real iPhone via Expo Go; starter screen imports `@oratio/shared` (timeAgo) and type-checks.
- **SCRUM-64: Shared package** — DONE (In Review). `packages/shared` holds prayer-data, validation, username, hashtags (pure parts); web consumes it via thin re-export shims (zero import churn, 420 tests green); the Expo app imports `@oratio/shared` and type-checks.
- **SCRUM-65 (next): Supabase auth + feed screens in the app.**

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
