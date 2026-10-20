# Oratio Design Index

Last reviewed: 2026-10-20. This directory is the active iOS-first design baseline.
It consolidates the implemented candidate and identifies planned work; it does
not certify a deployment, security review or App Store-ready release.

## Read In This Order

1. [Requirements](./REQUIREMENTS.md): intent, V1 boundaries and observable behavior.
2. [High-level design](../ARCHITECTURE.md): components, trust boundaries, data
   flow, delivery decisions and tradeoffs.
3. The relevant domain LLD below: contracts, transitions, failures, code and tests.
4. [Traceability](./TRACEABILITY.md): requirement, design, epic/story and evidence.
5. [Release readiness](../V1_RELEASE_READINESS.md), [functional QA](../QA-CHECKLIST.md)
   and [NFR acceptance](../NFR-CHECKLIST.md): what still needs proving.

## Low-Level Designs

| Design                                                      | Scope                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Identity and access](./lld/IDENTITY-AND-ACCESS.md)         | Session lifecycle, profiles, username continuity, preferences and avatars      |
| [Prayers and discovery](./lld/PRAYERS-AND-DISCOVERY.md)     | Submission, audiences, expiry/renewal, counts, comments, feed, map and sharing |
| [Circle and activity](./lld/CIRCLE-AND-ACTIVITY.md)         | Invitations, connection capacity, concurrency and Updates                      |
| [Safety and moderation](./lld/SAFETY-AND-MODERATION.md)     | Reports/details, review/actions, audit trail, blocking and quotas              |
| [External services](./lld/EXTERNAL-SERVICES.md)             | Translation, account deletion, legal/support and web handoffs                  |
| [Operations and delivery](./lld/OPERATIONS-AND-DELIVERY.md) | Notices, monitoring/privacy, CI, builds, recovery and release controls         |

LLDs describe existing source contracts, not a replacement REST API. Applied SQL
migrations are the exact schema authority. Expiry implementation is checkpointed
in `817b4b8` on the review branch; distribution and rollout evidence remain separate.

## Documentation Ownership

| Location                                        | Owns                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `docs/ARCHITECTURE.md`                          | Single HLD; do not create a competing `HLD.md`                                                     |
| `docs/design/`                                  | Active requirements, domain LLDs and traceability                                                  |
| `docs/backlog/`                                 | Story acceptance, delivery sequence, dated implementation/deployment/QA evidence; Jira sync source |
| `docs/QA-CHECKLIST.md`, `docs/NFR-CHECKLIST.md` | Functional and quality acceptance protocols                                                        |
| `docs/specs/`                                   | Historical PWA/prototype proposals, not active native contracts                                    |
| `docs/CODEBASE_NAVIGATION_GUIDE.md`             | Fast file lookup, not another detailed design                                                      |

Code/migrations establish implemented behavior, not necessarily desired behavior.
A requirement mismatch must remain explicit and map to a story; do not silently
weaken the requirement to match a limitation. A future backlog target is not
evidence that its design is implemented.

## Keeping It Useful

- Product goals/requirements drive epics/stories. HLD decisions shape dependencies;
  the relevant LLD evolves with each story, not only after implementation.
- Reuse the traceability owners before creating duplicate tickets. Retain story
  keys even when their epic name reflects an older release plan.
- Update only affected requirements, design, tests and acceptance records. Record
  rationale/date for scope or design changes.
- Keep rollout/test history in runbooks and link it here. Jira snapshots are
  dated; this is not an always-live backlog mirror.
- Do not put credentials or real private prayer/report text in design examples.
  Documentation does not authorise live writes, purchases, roles or deployment.
