# Oratio Backlog — Epics & Stories

Last updated: 2026-08-31

Lean, JIRA-ready backlog. Each story lists acceptance criteria (AC) and the
tests that prove it. **This backlog is live in JIRA** (project `SCRUM` at
https://oratio.atlassian.net) — this file is the canonical source to keep in
sync when work changes.

Live issue keys: epics `SCRUM-5`–`SCRUM-9`, stories `SCRUM-10`–`SCRUM-30`.

## Epic 1 — LAUNCH: Launch Readiness

Everything required before the public V1 launch.

| Key | Story | Priority | AC (summary) | Test mapping |
| --- | --- | --- | --- | --- |
| LAUNCH-1 | Move the app to a custom domain (Netlify DNS, HTTPS, www redirect) | Highest | Apex + www serve the app over HTTPS; `oratiotest.netlify.app` redirects; PWA installs from the new domain | `test:e2e:remote` against new URL |
| LAUNCH-2 | Update Supabase auth URLs and email templates for the custom domain | Highest | Password reset and email-confirmation links land on the new domain and complete the flow | manual reset walkthrough; `update-password.test.tsx` |
| LAUNCH-3 | Never-blank hardening: static loader, noscript message, early JS error card | Highest | Blank screen is impossible — always renders loader, app, or a visible error card | e2e landing smoke; manual JS-off check |
| LAUNCH-4 | Update OG/Twitter meta + e2e remote URLs to the new domain | High | Sharing the site on social shows correct title/image/URL | grep for old domain; `test:e2e:remote` |
| LAUNCH-5 | Pre-launch QA pass against the live site (full checklist) | Highest | Every row in `docs/QA-CHECKLIST.md` passes on a real phone (PWA + browser) | QA checklist; Playwright suite |

## Epic 2 — TEST: Testing & Observability Maturity

Make the quality story visible and the pipeline self-verifying.

| Key | Story | Priority | AC | Test mapping |
| --- | --- | --- | --- | --- |
| TEST-1 | Run authenticated Playwright journeys in CI with secret test credentials | High | `app-journeys.spec.ts` executes in CI (not skipped) using `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` secrets | e2e/app-journeys.spec.ts |
| TEST-2 | Publish the coverage report as a CI artifact + `docs/TESTING_OVERVIEW.md` | High | Every push exposes downloadable coverage HTML; overview doc maps feature → tests → commands | vitest coverage; ci.yml |
| TEST-3 | Sentry alert rules for release health | Medium | New issues and error-rate spikes email the owner within minutes | Sentry dashboard config |
| TEST-4 | Lighthouse baseline for landing + map route with a tracked budget | Medium | Recorded CI (or scheduled) Lighthouse run; score budget enforced | `npx lighthouse` script |

## Epic 3 — HARD: Post-Launch Hardening

Deferred cleanup that is safe after the launch week.

| Key | Story | Priority | AC | Test mapping |
| --- | --- | --- | --- | --- |
| HARD-1 | Drop unused tables (`follows`, `push_subscriptions`) via migration 037 | Medium | Tables removed; app and tests unaffected (waitlist stays — landing form uses it) | full suite + build |
| HARD-2 | Bundle analysis: shrink or re-strategise the HEIC converter chunk | Medium | First-load JS budget documented; HEIC chunk lazy strategy reviewed | `npx vite-bundle-visualizer` or rollup visualiser |
| HARD-3 | RLS security review of every Supabase table and policy | Medium | Review notes + any tightening applied via new migrations | manual review, `supabase/migrations/` |
| HARD-4 | Split remaining large files (feed render layer, prayer-detail) | Low | Files < ~500 lines; behavior unchanged | existing suite green throughout |

## Epic 4 — COMM: Community & Retention

Product decisions driven by real usage data after launch.

| Key | Story | Priority | AC | Test mapping |
| --- | --- | --- | --- | --- |
| COMM-1 | Prayer Circle usage review: keep, feature-flag, or cut based on PostHog data | Medium | Written decision with data in PostHog dashboard | PostHog dashboards |
| COMM-2 | Waitlist → beta engagement email (first "we launched" email) | Medium | One email to waitlist signups at launch | manual send review |
| COMM-3 | Social share polish: OG image pass + share-sheet copy | Low | Shared links render a branded preview card | manual platform previews |
| COMM-4 | Crisis resources content review | High | All links current and appropriate for a prayer app | `crisis-resources.test.tsx` + manual |

## Epic 5 — OPS: Platform & Operations

Keeping the product alive and cheap.

| Key | Story | Priority | AC | Test mapping |
| --- | --- | --- | --- | --- |
| OPS-1 | Scheduled daily production smoke check (cron GitHub Action → remote e2e) | High | Daily run reports pass/fail; failures notify | e2e remote suite |
| OPS-2 | Supabase backup/export strategy | High | Periodic export documented and verified | manual |
| OPS-3 | Cost review across Supabase, Netlify, PostHog, Sentry | Medium | Monthly cost under agreed budget | dashboards |
| OPS-4 | Living backlog workflow: jira-cli + this folder kept in sync | Low | New work lands in JIRA from this backlog | jira-cli |

## Import into JIRA (new instance / re-import)

1. JIRA → Issues → **Import issues from CSV** → upload `docs/backlog/import.csv`
2. Map columns: Issue Type, Summary, Epic Name, Priority, Labels, Description
3. Epics appear with their stories attached by Epic Name
