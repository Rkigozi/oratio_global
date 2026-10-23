# Oratio Backlog Working Agreement

Last reviewed: 2026-10-21. Project: [SCRUM](https://oratio.atlassian.net).
These story/runbook files are the sync source; mirror scope/acceptance changes
to Jira with evidence. This index is not a duplicate live status dashboard.
Use [traceability](../design/TRACEABILITY.md) for the dated requirement/story snapshot.

## Delivery Order

Follow the [release plan](../V1_RELEASE_READINESS.md): mobile implementation and
Expo Go acceptance precede TestFlight. Distribution entry requires an accepted
candidate, active Apple Developer Program membership and release approval.
Website conversion is a subsequent supporting release workstream. Android
distribution follows the initial public iOS release.

## Story Template

```text
Summary: <verb-first description of observable intent>

User Story:
As a <user>, I want <capability>, so that <value>.

Acceptance Criteria:
GIVEN <context> WHEN <action> THEN <observable result>

Design:
<FR/NFR ID, HLD/domain LLD and traceability entry>

Tests:
<test files, automated commands and applicable device/role checks>

Out of Scope:
<explicit boundary>
```

## Definition Of Done

- Changed behaviour has appropriate tests, passing relevant type checks, format,
  lint/build and security checks. Include native gates for native work and both
  clients/database checks when shared behaviour changes.
- Relevant requirements/design, acceptance and dated evidence are updated.
- Applicable user/device/role checks pass; known gaps are recorded with an owner.
- Deployment/distribution state is explicit. A mobile feature can be accepted in
  Expo Go without prematurely starting TestFlight; a distribution story requires
  its actual signed-build evidence. Backend changes require approved rollout.
- No silent release approval: a Done feature does not close `SCRUM-40` or an NFR.

Use In Progress for unfinished implementation/verification, In Review for a
reviewable candidate awaiting applicable acceptance, and Done only when that
story's criteria are satisfied. A documented external dependency is not a test pass.

## Priorities And Labels

| Priority | Meaning                                                      |
| -------- | ------------------------------------------------------------ |
| Highest  | Blocks V1 launch                                             |
| High     | Should land before launch; deferral needs an explicit reason |
| Medium   | Post-launch unless deliberately reprioritised                |
| Low      | Optional future improvement                                  |

Use `v1-launch`, `native`, `post-launch`, `platform`, `product`, `dev-experience`
and `nfr` consistently. Fix versions are V1 Launch, Post-Launch and Backlog.
Work is currently sequenced by priorities and release versions; story points are not used.

## Existing Ownership

| Epic                      | Key      | Scope                                                                                 |
| ------------------------- | -------- | ------------------------------------------------------------------------------------- |
| Launch readiness          | SCRUM-31 | Domain, store/public release and combined sign-off                                    |
| Testing and observability | SCRUM-32 | Test/monitoring maturity                                                              |
| Hardening                 | SCRUM-33 | Security and hardening; individual V1 story targets override the historical epic name |
| Community and retention   | SCRUM-34 | Includes public-prayer expiry, SCRUM-98                                               |
| Platform and operations   | SCRUM-35 | Notices, recovery, operations and workflow                                            |
| Native iOS product        | SCRUM-62 | Mobile journeys/quality, distribution and supporting-site cutover                     |
| Map foundations and scale | SCRUM-78 | V1 foundations 84-86; later growth 87-89                                              |
| Android release           | SCRUM-79 | Post-iOS work only                                                                    |

Reuse existing owners; do not create another documentation, website or architecture
epic just because a scope needs clarification. Status names and category-based Jira
charts may differ; verify actual issue status before making progress claims.

## Feature Records

| Record                                               | Owns                                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [Canonical places](./CANONICAL-PLACES.md)            | SCRUM-84 implementation, catalog provenance, rollout and device checks                        |
| [Map foundations/scale](./MAP-SCALABILITY.md)        | SCRUM-84-89 criteria and boundaries                                                           |
| [Expiry](./PUBLIC-PRAYER-EXPIRY.md)                  | SCRUM-98 lifecycle, rollout and renewal evidence                                              |
| [Moderation](./MODERATION-LAUNCH.md)                 | SCRUM-71 reports, review/actions and operational acceptance                                   |
| [Blocking](./USER-BLOCKING.md)                       | SCRUM-94 access/relationship enforcement and QA                                               |
| [Monitoring](./NATIVE-MONITORING.md)                 | SCRUM-43 telemetry/privacy, controlled events and alert evidence                              |
| [Network/session resilience](./NATIVE-RESILIENCE.md) | SCRUM-95 scoped implementation, fault tests and remaining signed-build/performance acceptance |
| [Security](./SECURITY-REVIEW.md)                     | SCRUM-47 policy review, migrations and exact advisory treatment                               |
| [Notices](./SERVICE-NOTICES.md)                      | SCRUM-97 independent banner/admin service and rollout                                         |
| [iOS distribution](./IOS-BUILD-PIPELINE.md)          | SCRUM-72/75 future signing/TestFlight setup and deployment controls                           |
| [Website](./WEB-PRESENCE.md)                         | SCRUM-74 retained services and later public-site conversion                                   |
| [Android](./ANDROID-RELEASE.md)                      | SCRUM-79 post-iOS plan                                                                        |

Detailed chronological evidence belongs in these records and the
[QA checklist](../QA-CHECKLIST.md). Do not copy it into this agreement or maintain
parallel status tables here. The external QA workbook is a separately dated sync,
not an automatically updated reflection of this repository.
