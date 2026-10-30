# Oratio V1 Release Readiness

Last reviewed: 2026-10-30. Defines the V1 delivery stages, prerequisites and
acceptance gates. The
[documentation index](./README.md) defines platform responsibilities.

## 1. Mobile Development Acceptance

Mobile V1 implementation and Expo Go acceptance precede TestFlight distribution.
Apple Developer Program membership remains pending and is a prerequisite for the
distribution stage, not for completing development. No signed build or website
cutover is scheduled.

Complete the agreed V1 scope and development acceptance:

- Map foundations: city-picker device acceptance (`SCRUM-84`), aggregate-only
  hotspot wider acceptance (`SCRUM-85`, reported iPhone hotspot/offline-retry smoke
  passed), and location paging device acceptance (`SCRUM-86`, implemented locally).
- Remaining safety/ownership/sharing/privacy checks (`SCRUM-71`, `SCRUM-81`,
  `SCRUM-94`) using existing evidence rather than repeating confirmed tests.
- Resolve the translation-provider dependency (`SCRUM-82`) or record an explicit
  product-approved scope decision. Provider delivery requires verification.
- Finish remaining applicable functional QA and development-stage security,
  monitoring/privacy, accessibility and reliability checks. Track quality proof
  in [NFR-CHECKLIST.md](./NFR-CHECKLIST.md), not as new features.
- Network/session hardening (`SCRUM-95`) has a local deadline/read-retry,
  account-boundary and write-recovery checkpoint for submission, comments/reports,
  Circle actions, interactions and prayer/profile/settings ownership changes. Finish the remaining
  journeys and device acceptance in the [resilience record](./backlog/NATIVE-RESILIENCE.md).
- Track the candidate in [draft PR #5](https://github.com/Rkigozi/oratio_global/pull/5)
  and pass applicable automated/CI gates. The October 30 development dependency
  approval covers only the pinned Expo CLI/Zod finding until November 13; strict
  release treatment remains open in the [security record](./backlog/SECURITY-REVIEW.md).
  That approval is not permission for external distribution.

### Current Evidence

| Area                   | Recorded state / source                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| City locations         | 044/045 applied and verified on Oratio_DB; app changes on the review branch and device acceptance open. [Place record](./backlog/CANONICAL-PLACES.md)                                                      |
| Map reliability/paging | Dedicated hotspot contract and cursor paging tested locally; reported iPhone hotspot/offline-retry smoke passed. Wider device acceptance and candidate CI open. [Map record](./backlog/MAP-SCALABILITY.md) |
| Public expiry          | 042/043 applied; client checkpoint on review branch; remaining acceptance is scoped in the [expiry record](./backlog/PUBLIC-PRAYER-EXPIRY.md)                                                              |
| Moderation/blocking    | Implemented journeys and dated confirmations in [moderation](./backlog/MODERATION-LAUNCH.md), [blocking](./backlog/USER-BLOCKING.md) and [QA](./QA-CHECKLIST.md); not whole-release sign-off               |
| Monitoring             | Expo Go error/email and scrubbed follow-up verified; wider privacy/native/signed-build checks open. [Monitoring record](./backlog/NATIVE-MONITORING.md)                                                    |
| Security               | 042 deployed; exact advisory treatment and outstanding deployed-policy review in the [security record](./backlog/SECURITY-REVIEW.md)                                                                       |
| Distribution           | Existing Expo team project linked and local EAS profiles prepared; no TestFlight release. [Build runbook](./backlog/IOS-BUILD-PIPELINE.md)                                                                 |

Keep automated counts in the dated feature record and link them here, so this
summary does not go stale after each run. Full current-candidate QA and all NFR
sign-offs remain distinct from those local results.

### Exit Criteria

- [ ] Agreed mobile V1 implementation complete, with no unaccepted core defects
- [ ] Applicable Expo Go functional QA and development quality checks recorded
- [ ] Exact candidate committed/reviewed; automated gates pass
- [ ] Remaining signed-build-only checks identified, not falsely marked passed
- [ ] TestFlight entry approved and Apple Developer Program membership active

Feature-complete in Expo Go does not mean signed-release accepted. Native crash,
release performance, installation/upgrade and some permission/link behaviour must
still be verified in the actual distributed binary.

## 2. Signed-Build Validation

Entry requires stage 1 acceptance and release approval:

1. Complete Apple membership, seller identity/App Store Connect, EAS client
   environment and signing setup in the [build runbook](./backlog/IOS-BUILD-PIPELINE.md).
2. Produce and identify a committed iOS candidate; install through TestFlight and
   test real auth, permissions, audience isolation, moderation and lifecycle.
3. Gather signed-build performance, crash/privacy, install/reinstall/upgrade and
   device-matrix evidence. Fix issues and repeat the affected checks.
4. Complete Beta NFR gates before inviting external testers with real user data.

Internal test binaries provide evidence for signed-build requirements. These
measurements are acceptance outputs of this stage, not prerequisites for producing
the first test artifact. Stage 1 remains the active implementation workstream.

## 3. Public Website And App Store Launch

The [website conversion](./backlog/WEB-PRESENCE.md) under `SCRUM-74` replaces
the public app journey with an Oratio information/download site while preserving
support, recovery, authorised shared links and protected operational tools.
This supporting workstream can run alongside beta/release preparation after
mobile development acceptance and deployment approval.

Before public launch, verify the actual production domain/auth links, support
and legal disclosures, operational ownership, recovery evidence and all Launch
NFRs. Complete store metadata/screenshots and signed-candidate QA. `SCRUM-40`
owns the combined go/no-go; `SCRUM-73` owns App Store preparation/submission.

Android (`SCRUM-79`), multiple Circles, messaging, push reminders and map growth
work (`SCRUM-87`-`SCRUM-89`) remain outside the current iOS V1 implementation.
