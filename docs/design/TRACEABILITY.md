# Requirements And Delivery Traceability

Last Jira reconciliation: 2026-10-20 across the full table; FR-02 updated on 2026-10-21
against source, approved backend rollout and live SCRUM-84/85/86 status checks.
FR-04/SCRUM-95 was reconciled against its implementation and live In Progress
transition on 2026-10-21; the wider table was not re-audited.
This is a dated snapshot, not automatic status synchronisation. Jira is at
`https://oratio.atlassian.net/browse/<key>`. Requirements:
[REQUIREMENTS.md](./REQUIREMENTS.md). HLD: [ARCHITECTURE.md](../ARCHITECTURE.md).

Delivery sequence, reviewed 2026-10-21: mobile implementation and Expo Go
acceptance precede TestFlight, which requires active Apple Developer Program
membership and release approval. Website conversion is a supporting release
workstream. Editorial revisions do not change Jira status or acceptance results.

The path is requirement -> HLD/domain LLD -> epic/story -> code/tests -> scoped
QA evidence -> release decision. Each LLD's source/test index supplies file-level
traceability. Implemented does not mean deployed or accepted for release.

## Functional Mapping

| Requirement                 | Design And Code/Test Index                                                             | Existing Epic / Stories                                                               | Acceptance Snapshot                                                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01 Account/session       | [Identity LLD](./lld/IDENTITY-AND-ACCESS.md)                                           | NATIVE `SCRUM-62`: `SCRUM-65`; LAUNCH `SCRUM-31`: `SCRUM-37`                          | 65 Done; launch-domain auth and signed-build session/failure acceptance remain open.                                                                                               |
| FR-02 Discovery/map         | [Discovery LLD](./lld/PRAYERS-AND-DISCOVERY.md)                                        | NATIVE 62: `SCRUM-66`, `SCRUM-76`; MAP `SCRUM-78`: `SCRUM-84`, `SCRUM-85`, `SCRUM-86` | 66/76 Done; 84/85/86 In Progress: canonical backend live, hotspot/cursor clients tested locally. Reported hotspot/offline-retry iPhone smoke passed; wider device acceptance open. |
| FR-03 Submit/ownership      | [Lifecycle LLD](./lld/PRAYERS-AND-DISCOVERY.md)                                        | NATIVE 62: `SCRUM-67`, `SCRUM-81`                                                     | 67 Done; 81 In Review. Reuse scoped owner/privacy evidence and retest changed candidate journeys.                                                                                  |
| FR-04 Interactions/comments | [Lifecycle LLD](./lld/PRAYERS-AND-DISCOVERY.md)                                        | NATIVE 62: `SCRUM-66`, `SCRUM-68`, `SCRUM-95`                                         | 66/68 Done; 95 In Progress. Scoped network/session and prayer-submission regressions exist locally; other write journeys and signed-build/performance proof remain open.           |
| FR-05 Circle/Updates        | [Circle LLD](./lld/CIRCLE-AND-ACTIVITY.md)                                             | NATIVE 62: `SCRUM-69`                                                                 | 69 Done; block, session and release checks remain under 94/95/40.                                                                                                                  |
| FR-06 Profiles/themes       | [Identity LLD](./lld/IDENTITY-AND-ACCESS.md)                                           | NATIVE 62: `SCRUM-70`, `SCRUM-77`, `SCRUM-80`, `SCRUM-96`                             | 70/77/80 Done; 96 To Do. 77 owns visual alignment, not a separate Updates implementation.                                                                                          |
| FR-07 Sharing               | [Lifecycle](./lld/PRAYERS-AND-DISCOVERY.md), [External](./lld/EXTERNAL-SERVICES.md)    | NATIVE 62: `SCRUM-81`, `SCRUM-73`; LAUNCH 31: `SCRUM-36`, `SCRUM-37`, `SCRUM-39`      | 81 In Review; launch domain/auth/metadata and store prep To Do. HTTPS fallback is not verified universal linking.                                                                  |
| FR-08 Safety                | [Safety LLD](./lld/SAFETY-AND-MODERATION.md)                                           | NATIVE 62: `SCRUM-71`, `SCRUM-94`; HARD `SCRUM-33`: `SCRUM-47`                        | 71 In Review; 94/47 In Progress. 042 is live; full security/operational acceptance remains open.                                                                                   |
| FR-09 Translation           | [External LLD](./lld/EXTERNAL-SERVICES.md)                                             | NATIVE 62: `SCRUM-82`; `SCRUM-47`                                                     | 82 Blocked: provider/billing and real delivery open. Adapter tests do not prove deployed gateway authentication.                                                                   |
| FR-10 Deletion/support      | [External LLD](./lld/EXTERNAL-SERVICES.md)                                             | NATIVE 62: `SCRUM-83`; `SCRUM-47`, `SCRUM-54`                                         | 83 Done for recorded app journey; storage/provider coverage and wider release evidence are separate.                                                                               |
| FR-11 Expiry/renewal        | [Lifecycle LLD](./lld/PRAYERS-AND-DISCOVERY.md)                                        | COMM `SCRUM-34`: [SCRUM-98](https://oratio.atlassian.net/browse/SCRUM-98)             | In Progress. 043 live; implementation checkpoint 817b4b8 on review branch. QA renewal state/data preservation verified; wider device acceptance open.                              |
| FR-12 Notices               | [Operations LLD](./lld/OPERATIONS-AND-DELIVERY.md)                                     | OPS `SCRUM-35`: `SCRUM-97`                                                            | In Progress. Isolated hosted/basic Expo checks recorded; permanent admin and production rollout open.                                                                              |
| FR-13 Web/handoffs          | [Website plan](../backlog/WEB-PRESENCE.md), [External LLD](./lld/EXTERNAL-SERVICES.md) | NATIVE 62: `SCRUM-74`; LAUNCH 31: `SCRUM-36`-`SCRUM-39`                               | Website/domain stories To Do: later supporting-site conversion, preserving protected web destinations.                                                                             |

Shared foundations `SCRUM-63`/`SCRUM-64` under NATIVE 62 are Done and support all
domains; they do not require a duplicate architecture epic. Release preparation
belongs to 72/73/75. Epic names/statuses do not override story release gates.

## Quality And Release Mapping

| Requirement                  | Design / Acceptance                                                                                                                                     | Existing Owner                                           | Remaining Proof                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| NFR-01 Security/privacy      | [Identity](./lld/IDENTITY-AND-ACCESS.md), [Safety](./lld/SAFETY-AND-MODERATION.md), [External](./lld/EXTERNAL-SERVICES.md); [NFRs](../NFR-CHECKLIST.md) | `SCRUM-47`, `SCRUM-71`, `SCRUM-94`                       | Full deployed table/RPC/storage/function review, cross-account checks and release dependency treatment. |
| NFR-02 Reliability/integrity | Domain failure paths; [NFR protocol](../NFR-CHECKLIST.md)                                                                                               | `SCRUM-95`                                               | Signed-build offline/slow/uncertain-write/session evidence.                                             |
| NFR-03 Performance/capacity  | [Discovery](./lld/PRAYERS-AND-DISCOVERY.md); [benchmark protocol](../NFR-CHECKLIST.md)                                                                  | `SCRUM-95`, `SCRUM-84`-`SCRUM-86`                        | Measured candidate and isolated load baseline; remaining unbounded helper reads.                        |
| NFR-04 Accessibility         | Native components/themes; [NFR protocol](../NFR-CHECKLIST.md)                                                                                           | `SCRUM-96`                                               | VoiceOver, Dynamic Type, targets and measured contrast on the agreed device matrix.                     |
| NFR-05 Monitoring/privacy    | [Operations](./lld/OPERATIONS-AND-DELIVERY.md), [runbook](../backlog/NATIVE-MONITORING.md)                                                              | TEST `SCRUM-32`: `SCRUM-43`                              | Real event/alert timing, native crash/privacy/symbolication and analytics acceptance.                   |
| NFR-06 Recovery              | [Operations](./lld/OPERATIONS-AND-DELIVERY.md); [NFR protocol](../NFR-CHECKLIST.md)                                                                     | OPS 35: `SCRUM-54`                                       | Verified backup/object coverage and isolated measured restore.                                          |
| NFR-07 Operations            | [Operations](./lld/OPERATIONS-AND-DELIVERY.md); [NFRs](../NFR-CHECKLIST.md)                                                                             | OPS 35: `SCRUM-53`; `SCRUM-40`, `SCRUM-71`               | Current-domain smoke/failed-alert evidence, ownership/coverage and initial cost/quota review.           |
| NFR-08 Reproducibility       | [Operations](./lld/OPERATIONS-AND-DELIVERY.md), [build runbook](../backlog/IOS-BUILD-PIPELINE.md)                                                       | NATIVE 62: `SCRUM-72`, `SCRUM-75`; LAUNCH 31: `SCRUM-40` | Apple/signing, signed binary, candidate CI/security, install/upgrade/relaunch and final decision.       |

No whole NFR is signed off here. Performance/recovery budgets and advisory
exception expiry remain exactly those in their acceptance records.

## Evidence And Next Work

- [QA checklist](../QA-CHECKLIST.md): dated maintainer-reported functional checks.
- [Expiry runbook](../backlog/PUBLIC-PRAYER-EXPIRY.md): automated tests, 042/043
  rollout and live expiry/renewal state checks. Backend state is not a complete
  visual, cross-account or release-device pass.
- [Security review](../backlog/SECURITY-REVIEW.md): scoped live hardening and
  development-only mitigation, not strict release acceptance.
- [Map plan](../backlog/MAP-SCALABILITY.md) and [place record](../backlog/CANONICAL-PLACES.md):
  84 implementation/rollout, 85 aggregate-only client verification and reported
  iPhone hotspot/offline-retry smoke, and 86 cursor paging verified locally.
  Wider device acceptance and candidate CI remain open; review revisions are
  tracked in [draft PR #5](https://github.com/Rkigozi/oratio_global/pull/5).
  Later 87-89 remain post-launch, not new V1 scope.
- [Network/session resilience](../backlog/NATIVE-RESILIENCE.md): scoped SCRUM-95
  deadline/read-retry, account-boundary and same-ID prayer-submission checkpoint;
  wider journey/device acceptance and performance measurements remain open.
- [Backlog agreement](../backlog/README.md): story template and DoD. Documentation
  reconciliation supports existing `SCRUM-56`; no new epic/story or automatic
  Done transition is introduced by this pass.

Next: finish remaining mobile implementation/Expo Go acceptance, including map
foundations, and verify development quality gates. Signed build/TestFlight follows
after distribution entry approval and active Apple Developer Program membership.
`SCRUM-73` owns store preparation; `SCRUM-40` owns the
combined release decision. Android remains post-iOS under `SCRUM-79`.
