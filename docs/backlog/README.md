# Oratio Backlog — Working Agreement

Last updated: 2026-09-11

Canonical source for the JIRA backlog (project `SCRUM` at
https://oratio.atlassian.net). This file and JIRA must stay in sync: change
work in one place, mirror it in the other (OPS: SCRUM-56).

Native migration keys: epic `SCRUM-62`, stories `SCRUM-63`–`SCRUM-75`.

## Story template

Every story follows this shape in JIRA:

```
Summary: <verb-first imperative, e.g. "Move the app to a custom domain">

User Story:
As a <user>, I want <capability>, so that <value>.

Acceptance Criteria:
GIVEN <context> WHEN <action> THEN <observable result>
...

Tests:
<the repo test files / commands that prove this story>

Out of scope:
<explicitly not included, to stop scope creep>
```

## Definition of Done (applies to every story)

- `npm run type-check`, `npm run lint`, `npm test`, `npm run build` all green
- Tests updated or added for the changed behaviour
- Relevant docs updated (`docs/`, memory bank)
- Deployed to live (or a documented reason why not)

## Priority semantics

| Priority | Meaning                                                             |
| -------- | ------------------------------------------------------------------- |
| Highest  | Blocks the V1 launch                                                |
| High     | Should land before launch; safe to defer only with a written reason |
| Medium   | Post-launch backlog                                                 |
| Low      | Nice-to-have; only with spare capacity                              |

## Labels

| Label            | Meaning                             |
| ---------------- | ----------------------------------- |
| `v1-launch`      | Must be done for the V1 launch      |
| `native`         | Expo/React Native product migration |
| `post-launch`    | After launch week                   |
| `platform`       | Infrastructure, security, ops       |
| `product`        | User-facing product work            |
| `dev-experience` | Testing, structure, maintainability |

## Versions (Fix Version)

| Version     | Purpose                                                   |
| ----------- | --------------------------------------------------------- |
| V1 Launch   | Everything in this release ships before the public launch |
| Post-Launch | The next wave after launch week                           |
| Backlog     | Uncommitted future work                                   |

## Estimation

No story points while it is a solo team — priorities and versions carry the
load. Introduce points (or T-shirt sizes) only when a second developer joins.

## Epics

| Epic                                       | Key      | Stories              |
| ------------------------------------------ | -------- | -------------------- |
| LAUNCH: Launch Readiness                   | SCRUM-31 | SCRUM-36…40          |
| TEST: Testing & Observability Maturity     | SCRUM-32 | SCRUM-41…44          |
| HARD: Post-Launch Hardening                | SCRUM-33 | SCRUM-45…48          |
| COMM: Community & Retention                | SCRUM-34 | SCRUM-49…52          |
| OPS: Platform & Operations                 | SCRUM-35 | SCRUM-53…56          |
| NATIVE: iOS Product Migration              | SCRUM-62 | SCRUM-63…75          |
| MAP: Map Scalability & Canonical Locations | Pending  | Six proposed stories |

Each epic description contains an Outcome statement and Success metrics —
track those, not task counts.

The proposed MAP epic and its story-level acceptance criteria live in
[`MAP-SCALABILITY.md`](./MAP-SCALABILITY.md). Jira keys must replace the pending
references here and in that file when the issues are created.

## Native migration snapshot

| Key      | Scope                                       | Jira status / repo state                                                                   |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| SCRUM-63 | Monorepo foundation                         | In Review; acceptance met                                                                  |
| SCRUM-64 | Shared platform-neutral logic               | In Review; acceptance met                                                                  |
| SCRUM-65 | Native email/password auth                  | In Review; acceptance met in Expo Go                                                       |
| SCRUM-66 | Native feed, detail, and prayer interaction | In Review; acceptance met; public filters, search/trending, save, and count integrity done |
| SCRUM-67 | Native prayer submission and visibility     | In Review; acceptance met across all three prayer spaces                                   |
| SCRUM-68 | Native comments and replies                 | In Review; comments, replies, and private Notes complete                                   |
| SCRUM-69 | Native Circle management and updates        | In Review; Circle management and live Updates complete                                     |
| SCRUM-70 | Native profile, settings, and avatar        | In Review; profile edit, avatar upload, preferences, and sign-out complete                 |
| SCRUM-71 | Native reporting and moderation             | To Do                                                                                      |
| SCRUM-72 | EAS/TestFlight beta distribution            | To Do; deferred until feature-complete beta + membership                                   |
| SCRUM-73 | App Store submission                        | To Do                                                                                      |
| SCRUM-74 | Reduce web to landing/web presence          | To Do; full PWA remains live during migration                                              |
| SCRUM-75 | Apple Developer membership                  | To Do; external prerequisite                                                               |

`SCRUM-63`–`SCRUM-67` are ready to close. The current Jira workflow has no correctly named Done transition; its only Done-category transition is named Blocked. They remain In Review until that workflow status is corrected rather than being inaccurately marked Blocked.

## Import into JIRA (new instance / re-import)

1. JIRA → Issues → **Import issues from CSV** → upload `docs/backlog/import.csv`
2. Map columns: Issue Type, Summary, Epic Name, Priority, Labels, Description
3. Epics appear with their stories attached by Epic Name

(Or recreate programmatically with the REST API — the script used for the
current board is `/tmp/rebuild-backlog.py` on the dev machine; keep a copy in
`scripts/` if this becomes a routine.)
