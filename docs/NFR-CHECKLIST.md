# Oratio iOS Launch NFR Checklist

Last updated: 2026-10-30 (review evidence; acceptance targets unchanged)

Non-functional requirements define how safely, reliably and accessibly Oratio
must work, alongside the features in [functional QA](./QA-CHECKLIST.md).
Scope: the iOS product, its shared backend and launch-critical web destinations.
The [active requirements](./design/REQUIREMENTS.md) define product scope.

The [design baseline](./design/README.md) and [traceability](./design/TRACEABILITY.md)
connect these requirements to domain LLDs, existing stories and tests. Current
delivery order is mobile implementation and Expo Go acceptance, followed by
signed-build validation. Distribution requires active Apple Developer Program
membership and release approval. Development checks proceed independently;
signed-build measurements remain open until the distribution stage.

## Gates And Evidence

- **Beta**: required before external TestFlight distribution with real user data.
- **Launch**: required before the public Apple App Store release; Beta gates still apply.
- Internal signed builds may be produced to gather evidence. This checklist does
  not require a TestFlight result before it is possible to create a test build.
- Numerical performance, timeout, alert and recovery budgets below are initial
  engineering targets, not measured results, provider guarantees or customer SLAs.
  Changes require a recorded release-owner decision, not silently lowering a
  target after a failed test.
- **Partial** means scoped evidence exists, not that the whole requirement passed.
  **Open** means acceptance evidence has not been established. All eight gates
  remain unsigned as of this update; no new device, load or restore tests were run.
- Record date/tester, Git SHA, app version/build and EAS build ID, device/iOS,
  backend environment/migration revision, conditions, expected/actual result,
  artifact link and defect key in the owning Jira ticket. Never attach passwords,
  tokens or real private prayer/report text.

The release owner signs off through [SCRUM-40](https://oratio.atlassian.net/browse/SCRUM-40).
Development-only approval (2026-10-30): the exact pinned Expo CLI/Zod findings
are accepted for development review until `2026-11-13T00:00:00Z`. Published Forge
1.4.2 replaces the earlier backport; the superseded approval is archived. The
strict release audit and every NFR sign-off remain separate. See
[the active approval record](./backlog/SECURITY-REVIEW.md#approved-zod-development-exception-2026-10-30).
Confirmed unauthorized access, data-loss defects and crashes or accessibility
failures preventing an essential journey block release. Any other unmet gate
needs an explicit, time-limited risk decision and follow-up; it is not a pass.

## Acceptance Register

| ID / Requirement                                 | Measurable acceptance target                                                                                                                                                                                                                                                                                                                                                                               | Gate                    | Evidence / remaining work                                                                                                                                                                                                                                                                                        | Jira                                                                                                                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 Security and privacy                      | Zero unexpected permitted reads/writes across owner, Circle peer, outsider, blocked, signed-out and moderator roles, including direct API/RPC/storage access. Review all deployed policies/grants and sensitive logging; no privileged client credentials. No unresolved exploitable high/critical dependency finding; every moderate finding fixed or explicitly assessed with a time-limited mitigation. | Beta                    | **Partial**: focused policy/race tests and cross-account checks exist; 042 is deployed. Full current-policy review, remaining blocking/privacy checks and release advisory treatment remain open in the security record.                                                                                         | [SCRUM-47](https://oratio.atlassian.net/browse/SCRUM-47), [SCRUM-71](https://oratio.atlassian.net/browse/SCRUM-71), [SCRUM-94](https://oratio.atlassian.net/browse/SCRUM-94) |
| NFR-02 Reliability and data integrity            | Action feedback within 500 ms; stalled requests reach a recoverable state within 20 s. Recoverable failures retain current-session drafts; no false success or duplicated writes/counts after repeated taps or uncertain-result retries. Logout, expired sessions, account changes and revoked access never expose stale unauthorized content.                                                             | Beta                    | **Partial**: prior Expo Go report/privacy evidence plus local deadlines, strict read retries, account boundaries and recovery regressions for prayer/comment/report, Circle, interaction and profile/settings writes. Wider journeys/device proof remain open; see [resilience](./backlog/NATIVE-RESILIENCE.md). | [SCRUM-95](https://oratio.atlassian.net/browse/SCRUM-95)                                                                                                                     |
| NFR-03 Performance and launch capacity           | Signed-build p95 usable cold-start shell <=3 s; first feed/map data <=3 s from its request under recorded normal-network conditions. Bounded staging baseline: read API p95 <=1 s and unexpected errors <1% at 25 concurrent sessions for 10 minutes. No unbounded client fetch of prayers.                                                                                                                | Launch                  | **Open / unmeasured**: no native timing or load baseline recorded. Map foundations remain part of the existing plan. Use the protocol below, not web Lighthouse or Expo Go timings.                                                                                                                              | [SCRUM-95](https://oratio.atlassian.net/browse/SCRUM-95), SCRUM-84/85/86                                                                                                     |
| NFR-04 Accessibility                             | Core journeys complete with VoiceOver and maximum accessibility text size in both themes; correct names, focus and error announcements. Targets >=44 x 44 pt. Text contrast >=4.5:1 (qualifying large text >=3:1), essential non-text cues >=3:1. No colour-only status or motion-dependent essential action.                                                                                              | Launch                  | **Partial**: theme and reporting keyboard checks passed. Full VoiceOver, Dynamic Type, target-size and measured contrast pass remains open.                                                                                                                                                                      | [SCRUM-96](https://oratio.atlassian.net/browse/SCRUM-96)                                                                                                                     |
| NFR-05 Native monitoring and privacy             | A controlled non-production Sentry error is visible within 5 minutes and alerts the named owner within 10 minutes. Build/version/environment/SHA identify the release. Analytics and errors exclude prayer/report text, emails, precise coordinates, credentials and tokens; disabled/unavailable telemetry never blocks use.                                                                              | Beta                    | **Partial**: Expo Go error/email and follow-up filtered geography verified 2026-10-20. Full payload review, measured release timings, native crash privacy, symbolication, PostHog and signed-build verification remain open.                                                                                    | [SCRUM-43](https://oratio.atlassian.net/browse/SCRUM-43)                                                                                                                     |
| NFR-06 Backup and recovery                       | Verified backup/export coverage with working RPO <=24 h and RTO <=24 h. Restore in isolation; login, audience boundaries, blocking and moderator permissions pass before any traffic switch. Reconcile deletions/revocations since the backup.                                                                                                                                                             | Beta                    | **Open**: actual plan, schedule, retention, object coverage, failure alerts and measured restore drill are not verified. No production restore or paid upgrade is authorized by this checklist.                                                                                                                  | [SCRUM-54](https://oratio.atlassian.net/browse/SCRUM-54)                                                                                                                     |
| NFR-07 Operational readiness                     | Recent launch-domain smoke pass plus controlled failed-check notification received within 10 minutes. Named incident/moderation owner, review coverage and escalation route recorded. Launch usage/cost budget and provider quotas checked; alert or manual review arrangements recorded before sign-off.                                                                                                  | Launch                  | **Partial**: daily public-web smoke workflow exists. Successful current-domain run, alert delivery, operational ownership and initial cost/limit review remain to be evidenced. No continuous uptime or 24/7 response promise.                                                                                   | [SCRUM-53](https://oratio.atlassian.net/browse/SCRUM-53), SCRUM-40/71                                                                                                        |
| NFR-08 Release reproducibility and compatibility | Latest candidate passes applicable CI/security gates, has traceable SHA/version/build and approved migrations, and completes signed-build install, upgrade, relaunch and core-journey checks on the agreed iPhone/iOS matrix. No unresolved release-blocking defect.                                                                                                                                       | Beta; repeat for Launch | **Partial**: local EAS setup, tests, type-check, Doctor and JS export passed. Apple/signing setup, actual binary installation and release-device acceptance remain open.                                                                                                                                         | [SCRUM-72](https://oratio.atlassian.net/browse/SCRUM-72), SCRUM-40                                                                                                           |

The [security record](./backlog/SECURITY-REVIEW.md) owns exact audit history,
active development controls and remaining release treatment. Migration 042 is
live; catalog migrations 044/045 have their own [rollout evidence](./backlog/CANONICAL-PLACES.md).
Neither deployment nor a development-only exception signs off NFR-01.

The 2026-10-30 approved development policy passes while reporting all 3 high
and 5 low affected-package entries. Hosted checks passed for `1c197a6` in
[CI run 41052478797](https://github.com/Rkigozi/oratio_global/actions/runs/41052478797).
This predates the current write-recovery changes; their local evidence belongs in
[the resilience record](./backlog/NATIVE-RESILIENCE.md#verification), with the new
candidate/hosted result tracked in draft PR #5. Strict release audit treatment and
NFR-01/08 sign-off remain open.

## Test Boundaries

Monitoring uses opt-in JS reporting with payload/envelope allowlisting. Controlled
Expo Go event/email delivery and filtered follow-up were verified on 2026-10-20;
see the [monitoring runbook](./backlog/NATIVE-MONITORING.md) for exact timing and
provider controls. Full payload review, native crash/symbolication, analytics and
signed-build acceptance remain open. NFR-05 is still unsigned; disabled telemetry
must not block use.

### Reliability And Performance

Core journeys: authentication, prayer read/submit, comments, Circle invitations,
report/block, profile/settings and map navigation. Inject offline, slow or
blackholed requests, server errors, expired sessions and background/foreground
transitions only in a controlled test environment. Include the case where a write
succeeds but its response is lost. Draft retention means the current app session,
not a new persistent offline queue or a promise to survive force-quit.

Agree and record the oldest supported physical iPhone/iOS test combination and a
current supported combination before sign-off; that coverage is currently **TBD**.
Use a signed Release/TestFlight build, not a development bundle. Record network
latency/throughput and backend region. Collect 20 samples per device and timing
metric; report raw samples, failure count and nearest-rank p95 (19th of 20 sorted
samples). Separately record tap-to-content time and actual map-tile readiness so
a fast shell/data query does not hide a blank map. Failures are not fast samples.

The initial staging fixture is 10,000 synthetic public prayers across 20 places,
including 2,000 in one place. Use 25 concurrent authenticated sessions repeatedly
reading first feed pages, hotspots and location pages for 10 minutes, with a
recorded one-second pause between completed operations per session. Measure API
latency/error rate by endpoint, payload sizes and bounded pagination. Record the
load-generator location, service tier and script/fixture revision. No load test
or fixture writes against the live user database without separate approval.
This is an initial launch envelope, not proof of support for millions of prayers.

### Accessibility

Include authentication, tabs, reading/submission, Circle, reporting/blocking,
profile/settings, modal entry/return focus and validation announcements. Check
the largest iOS accessibility text setting with keyboard and sheets open, both
themes, VoiceOver and Reduce Motion. Existing 44 pt product targets remain the
minimum. Contrast targets use [W3C text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
and [non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
as engineering checks, not a claim of comprehensive WCAG certification. The large
text exception requires at least 18 pt regular or 14 pt bold; otherwise use 4.5:1.

### Recovery And Operations

RPO is maximum tolerated data loss; RTO is time from incident declaration to
verified service recovery. Inventory database data/schema/policies, auth,
functions/configuration/secrets and stored files before the drill. Supabase
database backups do not include Storage objects; verify a separate object
recovery path rather than assuming avatars are covered. See [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).
Use an isolated environment and approved data handling; do not copy live personal
data into an unapproved test project. Record backup age, restoration time, privacy
rechecks, deletion/revocation reconciliation and any manual prerequisites.

The daily public-web smoke job is not continuous backend or native monitoring.
Native error alerts belong to NFR-05; authenticated backend verification belongs
to release QA. Define who reviews moderation reports and failure notifications,
when, and how they escalate. Continuous staffed response is not currently provided.
The launch cost budget and provider changes require explicit operational approval.

## Existing Evidence To Reuse

- [Functional QA](./QA-CHECKLIST.md): dated share/copy, private-account isolation,
  report details/limit/keyboard/theme and offline report-retry confirmations.
  Reuse those results for their tested build and scope, not as whole-NFR sign-off.
- [Blocking](./backlog/USER-BLOCKING.md): migration 041, focused database assertions,
  concurrent-session tests and recorded basic block/unblock device results.
- [Moderation](./backlog/MODERATION-LAUNCH.md): report-scoped review/actions and
  audit-history implementation; operational follow-ups still open.
- [Build runbook](./backlog/IOS-BUILD-PIPELINE.md): prepared local profiles/checks,
  future signing steps and deployment boundaries. A JS export is not a
  signed-binary performance, install or upgrade test.
- `.github/workflows/smoke.yml`: existing daily/manual public-web checks. A file
  in the repository is not evidence that the current production run or alert passed.

## Deferred Scope And Jira Sync

Jira aligned on 2026-09-30: SCRUM-43/47/53/54 now target **V1 Launch**, not
Post-Launch; SCRUM-40 owns aggregate sign-off. New SCRUM-95 and SCRUM-96 are under
the native epic SCRUM-62. All seven have **Highest** priority and label `nfr`.
SCRUM-47 is **In Progress** following the first tested security batch, and
SCRUM-43 is **In Progress** for the local monitoring foundation (2026-10-08).
SCRUM-95 is **In Progress** for the scoped resilience implementation; the other
four remain **To Do**. Existing functional story statuses are unchanged.
SCRUM-47 retains its existing
hardening epic for continuity; its story-level release target now governs timing.

- Android/TalkBack/Play Store: SCRUM-79 and SCRUM-90 through SCRUM-93, after iOS.
- Million-prayer fixtures, precomputed scale statistics and viewport clustering:
  SCRUM-87 through SCRUM-89. The bounded NFR-03 baseline is required first.
- Automated web Lighthouse budgets and HEIC bundle optimisation: SCRUM-44/46;
  neither proves native performance. Launch-critical web journeys still need QA.
- Recurring monthly cost review: SCRUM-55; the initial launch budget/limit check
  is NFR-07. Cross-region recovery, a paid synthetic-monitoring service, session
  replay and a staffed on-call rotation are not introduced here.

Only this NFR slice was reconciled with Jira. This is not a full-backlog audit or
an update to the external QA Google Sheet.
