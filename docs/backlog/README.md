# Oratio Backlog — Working Agreement

Last updated: 2026-09-12

Canonical source for the JIRA backlog (project `SCRUM` at
https://oratio.atlassian.net). This file and JIRA must stay in sync: change
work in one place, mirror it in the other (OPS: SCRUM-56).

Native migration keys: epic `SCRUM-62`, stories `SCRUM-63`–`SCRUM-77` and
`SCRUM-80`–`SCRUM-83`.

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

## Release order

Oratio launches publicly on the Apple App Store first. The native V1 sprint,
TestFlight QA, and App Store submission therefore cover iOS only. Android work
is intentionally isolated under `SCRUM-79`, labelled `post-launch`, and parked
in the future sprint so it cannot become an implicit V1 dependency.

## Estimation

No story points while it is a solo team — priorities and versions carry the
load. Introduce points (or T-shirt sizes) only when a second developer joins.

## Epics

| Epic                                       | Key      | Stories                   |
| ------------------------------------------ | -------- | ------------------------- |
| LAUNCH: Launch Readiness                   | SCRUM-31 | SCRUM-36…40               |
| TEST: Testing & Observability Maturity     | SCRUM-32 | SCRUM-41…44               |
| HARD: Post-Launch Hardening                | SCRUM-33 | SCRUM-45…48               |
| COMM: Community & Retention                | SCRUM-34 | SCRUM-49…52               |
| OPS: Platform & Operations                 | SCRUM-35 | SCRUM-53…56               |
| NATIVE: iOS Product Migration              | SCRUM-62 | SCRUM-63…77, SCRUM-80…83  |
| MAP: Map Scalability & Canonical Locations | SCRUM-78 | SCRUM-84…89               |
| ANDROID: Android Release                   | SCRUM-79 | SCRUM-90…93 (post-launch) |

Each epic description contains an Outcome statement and Success metrics —
track those, not task counts.

The MAP story-level acceptance criteria live in
[`MAP-SCALABILITY.md`](./MAP-SCALABILITY.md). The future Android release plan
lives in [`ANDROID-RELEASE.md`](./ANDROID-RELEASE.md).

## Native migration snapshot

| Key      | Scope                                       | Jira status / repo state                                                  |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| SCRUM-63 | Monorepo foundation                         | Done                                                                      |
| SCRUM-64 | Shared platform-neutral logic               | Done                                                                      |
| SCRUM-65 | Native email/password auth                  | Done                                                                      |
| SCRUM-66 | Native feed, detail, and prayer interaction | Done; public filters, search/trending, save, and count integrity included |
| SCRUM-67 | Native prayer submission and visibility     | Done across all three prayer spaces                                       |
| SCRUM-68 | Native comments and replies                 | Done; comments, replies, and private Notes included                       |
| SCRUM-69 | Native Circle management and updates        | Done; Circle management and live Updates included                         |
| SCRUM-70 | Native profile, settings, and avatar        | Done; profile edit, avatar upload, preferences, and sign-out included     |
| SCRUM-71 | Native reporting and moderation             | To Do; Highest; V1 Launch                                                 |
| SCRUM-72 | EAS/TestFlight beta distribution            | To Do; waits for feature-complete beta and Apple membership               |
| SCRUM-73 | Apple App Store submission                  | To Do                                                                     |
| SCRUM-74 | Reduce web to landing/web presence          | To Do; full PWA remains live during migration                             |
| SCRUM-75 | Apple Developer membership                  | To Do; external prerequisite                                              |
| SCRUM-76 | Native global prayer map                    | Done                                                                      |
| SCRUM-77 | Native Updates inbox                        | Done                                                                      |
| SCRUM-80 | Native light/dark/system themes             | Done; automated and physical iPhone QA complete                           |
| SCRUM-81 | Native prayer owner actions and sharing     | In QA; implementation and automated gates complete                        |
| SCRUM-82 | Native saved-language translation           | To Do; Highest; V1 Launch                                                 |
| SCRUM-83 | Account deletion and legal support access   | To Do; Highest; V1 Launch                                                 |

The Jira workflow now has a correctly named `Done` status. Completed native
stories `SCRUM-63`–`SCRUM-70`, `SCRUM-76`, `SCRUM-77`, and `SCRUM-80` were
closed on 2026-09-12; remaining launch work stays open until implementation and
QA meet the Definition of Done.

## Map and Android snapshot

| Keys        | Scope                                      | Jira status / release track       |
| ----------- | ------------------------------------------ | --------------------------------- |
| SCRUM-84…86 | Canonical places, hotspot contract, paging | To Do; High; V1 Launch            |
| SCRUM-87…89 | Map aggregates, clustering, scale QA       | To Do; Medium; future sprint      |
| SCRUM-90…93 | Android compatibility and Play release     | To Do; Medium; future/post-launch |

## Import into JIRA (new instance / re-import)

1. JIRA → Issues → **Import issues from CSV** → upload `docs/backlog/import.csv`
2. Map columns: Issue Type, Summary, Epic Name, Priority, Labels, Description
3. Epics appear with their stories attached by Epic Name

(Or recreate programmatically with the REST API — the script used for the
current board is `/tmp/rebuild-backlog.py` on the dev machine; keep a copy in
`scripts/` if this becomes a routine.)
