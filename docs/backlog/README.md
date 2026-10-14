# Oratio Backlog — Working Agreement

Last updated: 2026-10-07

Canonical source for the JIRA backlog (project `SCRUM` at
https://oratio.atlassian.net). This file and JIRA must stay in sync: change
work in one place, mirror it in the other (OPS: SCRUM-56).

Native migration keys: epic `SCRUM-62`, stories `SCRUM-63`–`SCRUM-77` and
`SCRUM-80`–`SCRUM-83`, and `SCRUM-94`–`SCRUM-96`.

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

| Label            | Meaning                              |
| ---------------- | ------------------------------------ |
| `v1-launch`      | Must be done for the V1 launch       |
| `native`         | Expo/React Native product migration  |
| `post-launch`    | After launch week                    |
| `platform`       | Infrastructure, security, ops        |
| `product`        | User-facing product work             |
| `dev-experience` | Testing, structure, maintainability  |
| `nfr`            | Measurable non-functional acceptance |

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

| Epic                                       | Key      | Stories                               |
| ------------------------------------------ | -------- | ------------------------------------- |
| LAUNCH: Launch Readiness                   | SCRUM-31 | SCRUM-36…40                           |
| TEST: Testing & Observability Maturity     | SCRUM-32 | SCRUM-41…44                           |
| HARD: Post-Launch Hardening                | SCRUM-33 | SCRUM-45…48                           |
| COMM: Community & Retention                | SCRUM-34 | SCRUM-49…52                           |
| OPS: Platform & Operations                 | SCRUM-35 | SCRUM-53…56, SCRUM-97                 |
| NATIVE: iOS Product Migration              | SCRUM-62 | SCRUM-63…77, SCRUM-80…83, SCRUM-94…96 |
| MAP: Map Scalability & Canonical Locations | SCRUM-78 | SCRUM-84…89                           |
| ANDROID: Android Release                   | SCRUM-79 | SCRUM-90…93 (post-launch)             |

Each epic description contains an Outcome statement and Success metrics —
track those, not task counts.

The MAP story-level acceptance criteria live in
[`MAP-SCALABILITY.md`](./MAP-SCALABILITY.md). The future Android release plan
lives in [`ANDROID-RELEASE.md`](./ANDROID-RELEASE.md).

## Service notices

[SCRUM-97](https://oratio.atlassian.net/browse/SCRUM-97) tracks owner-published
maintenance notices: In Progress, High priority, V1 Launch, under OPS.
The admin editor, independent notice endpoint and nonblocking native banner
are implemented. On 2026-10-06 the owner-approved isolated test deployment
passed real hosted API and browser checks, with Miriam's verified QA ID allowed
only in its named test context. All disposable notices were withdrawn;
production deployment/environment remain unchanged. Expo is configured for
the test URL. The user confirmed the basic Expo notice journey; on 2026-10-07
optional maintenance dates were added to the banner, formatted in the viewer's
local timezone independently of display/expiry. Focused automated coverage
passes; device verification of the new date line is still open.
Detailed physical iPhone QA, a separate permanent admin account and
approved production rollout remain open; no database role was granted.
See [SERVICE-NOTICES.md](./SERVICE-NOTICES.md) for the
rollout, operating limits and evidence. No blocking maintenance mode is included.

## iOS NFR acceptance

The [iOS NFR checklist](../NFR-CHECKLIST.md) is the acceptance source for
measurable quality gates. Jira sync on 2026-09-30 is scoped to the following
items; no test results or completed statuses were manufactured.

| Key      | Scope                                                          | Jira status / release track                                                                |
| -------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| SCRUM-40 | Combined functional and NFR release sign-off                   | To Do; Highest; V1 Launch                                                                  |
| SCRUM-43 | Native monitoring and privacy-safe telemetry                   | In Progress; Highest; V1 Launch; local JS error reporting, remote/native verification open |
| SCRUM-47 | Current RLS/access review and dependency exposure assessment   | In Progress; Highest; V1 Launch; tested local hardening, live deployment/review pending    |
| SCRUM-53 | Verify existing public-web smoke and failed-check notification | To Do; Highest; moved to V1 Launch                                                         |
| SCRUM-54 | Verified backup coverage and isolated recovery drill           | To Do; Highest; moved to V1 Launch                                                         |
| SCRUM-95 | Native performance and network/session resilience              | New; To Do; Highest; V1 Launch; native epic SCRUM-62                                       |
| SCRUM-96 | Native accessibility acceptance                                | New; To Do; Highest; V1 Launch; native epic SCRUM-62                                       |

All seven carry `nfr`. Existing functional QA evidence is linked in the checklist,
but none of these complete quality gates is signed off. SCRUM-47 remains under
the existing hardening epic; its V1 story release target takes precedence over
that epic's historical post-launch name. Android, million-prayer scaling and
recurring monthly cost reviews remain deferred. The QA Google Sheet was not
updated by this NFR reconciliation.

Monitoring checkpoint (2026-10-08): [NATIVE-MONITORING.md](./NATIVE-MONITORING.md)
records the local opt-in Sentry foundation and privacy/failure tests. No Sentry
project, remote delivery, alert or native-crash verification is claimed;
SCRUM-43 remains In Progress. Changes remain local and reporting defaults to off.

Sentry setup (2026-10-13): `oratio-mobile` is created under the existing
organisation and assigned to `#oratio`, with high-priority email alerts routed
to that team. The web project is retained. The mobile DSN is prepared only in
ignored local configuration, reporting disabled. Real delivery/alert timing
and native crash verification remain open; see the monitoring runbook.

Security review checkpoint (2026-10-07): [SECURITY-REVIEW.md](./SECURITY-REVIEW.md)
records the dependency patches, migration 042 for waitlist/quota access, 140 SQL
assertions and nine concurrent-session cases. After compatible patches, production
audit counts are zero for web and seven moderate/14 high/zero critical for mobile.
After the tooling follow-up, web including development tools is clean and the full
tree retains 12 moderate/45 high/zero critical entries from four underlying
advisories. Shipped-JavaScript source-map checks and residual tooling exposure
are recorded in the review. The mobile CI audit
is blocked and SCRUM-47 remains In Progress, not Done;
the migration is not live and the full deployed-policy review remains open.

## Native migration snapshot

| Key      | Scope                                       | Jira status / repo state                                                                                     |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| SCRUM-63 | Monorepo foundation                         | Done                                                                                                         |
| SCRUM-64 | Shared platform-neutral logic               | Done                                                                                                         |
| SCRUM-65 | Native email/password auth                  | Done                                                                                                         |
| SCRUM-66 | Native feed, detail, and prayer interaction | Done; public filters, search/trending, save, and count integrity included                                    |
| SCRUM-67 | Native prayer submission and visibility     | Done across all three prayer spaces                                                                          |
| SCRUM-68 | Native comments and replies                 | Done; comments, replies, and private Notes included                                                          |
| SCRUM-69 | Native Circle management and updates        | Done; Circle management and live Updates included                                                            |
| SCRUM-70 | Native profile, settings, and avatar        | Done; profile edit, avatar upload, preferences, and sign-out included                                        |
| SCRUM-71 | Native reporting and moderation             | In Review; report-form/privacy QA recorded; remaining edge-case/enforcement/release checks open              |
| SCRUM-72 | EAS/TestFlight beta distribution            | In Progress; existing Expo team project linked; EAS environment, Apple setup and signed distribution pending |
| SCRUM-73 | Apple App Store submission                  | To Do                                                                                                        |
| SCRUM-74 | Reduce web to landing/web presence          | To Do; full PWA remains live during migration                                                                |
| SCRUM-75 | Apple Developer membership                  | To Do; membership inactive; individual/organisation seller decision open                                     |
| SCRUM-76 | Native global prayer map                    | Done                                                                                                         |
| SCRUM-77 | Native Updates inbox                        | Done                                                                                                         |
| SCRUM-80 | Native light/dark/system themes             | Done; automated and physical iPhone QA complete                                                              |
| SCRUM-81 | Native prayer owner actions and sharing     | In QA; iPhone share/copy retest passed; remaining owner/privacy QA open                                      |
| SCRUM-82 | Native saved-language translation           | Blocked; implementation complete, Google Cloud billing reactivation needed                                   |
| SCRUM-83 | Account deletion and legal support access   | Done; live disposable-account deletion and production links verified                                         |
| SCRUM-94 | Native user blocking and blocked accounts   | In Progress; migration 041 live; basic profile/prayer/comment block and unblock QA passed; edge checks open  |

The Jira workflow now has a correctly named `Done` status. Completed native
stories `SCRUM-63`–`SCRUM-70`, `SCRUM-76`, `SCRUM-77`, and `SCRUM-80` were
closed on 2026-09-12; `SCRUM-83` was closed after live deletion QA on
2026-09-13. Remaining launch work stays open until implementation and QA meet
the Definition of Done.

`SCRUM-81` private-prayer follow-up (2026-09-14): the native composer now
chooses audience before location, hides and clears location for Private, ignores
stale location detection, and keeps private entry points and repeat submissions
private by default. New private prayers omit location in the shared save layer;
native private lists and detail show personal notes without location or social
prayer counts. Physical iPhone QA of this follow-up is pending; the previously
confirmed share/copy retest remains passed.

Moderation follow-up (2026-09-23): report-scoped content review, required internal
decision reasons, atomic Hide/Dismiss actions, reversible hiding, append-only
decision history, bounded queue pages, and explicit load errors are implemented
locally. Optional reporter details and explicit Submit are implemented on native
and web. Migrations 039 and 040 passed disposable PostgreSQL tests and were
applied to Oratio_DB with owner approval; live Circle report review now loads.
No moderator role was granted or content action taken during the rollout. Deployment, physical-device
report-form QA, live two-account enforcement QA, and remaining launch-safety work
stay open. See [MODERATION-LAUNCH.md](./MODERATION-LAUNCH.md).

Moderation QA follow-up (2026-09-24): the user confirmed public-prayer Restore,
Dismiss without hiding the prayer, and fresh-report arrival within 30 seconds in
the local web queue after reporting in Expo. Circle restoration, comment reports,
privacy, and broader enforcement/release-device checks remained open at that point. The QA Google
workbook's `MOD-002` evidence and migration record were updated without changing
historical PWA pass statuses; this is not launch sign-off or a Jira status change.

Moderation QA follow-up (2026-09-26): the user confirmed Hide/Restore after Expo
refresh preserves the original audience, excludes an unconnected account, and
retains Resolved status with both audit actions. The user also confirmed comment
reporting with optional details, explicit Submit, moderator review, and duplicate
feedback was already tested. Jonah's review update after Miriam dismisses a report
shows the outcome without her internal decision note (user-confirmed). Offline
submission retains the report draft with a clear error, and retry after reconnecting
succeeds without duplicates (user-confirmed). Recorded in the local checklist and
synced to the Google workbook's `REPORT-001` / `MOD-002` evidence notes. Reporter-details and other-reporter identity
privacy, form limits, no-details submission, keyboard/authentication-error handling,
and broader enforcement/release checks remain open.

Report-length feedback fix (2026-09-26): native and web report forms retain text
over 1000 characters, show the excess count, and block Submit until shortened.
Exactly 1000 characters remain valid; shared Unicode counting matches the
existing database length constraint. Automated suites/type-checks/lint/build and
desktop/phone-width web checks passed. The user confirmed the new warning on the
physical iPhone; full light/dark and keyboard coverage remains open.

Build preparation (2026-09-29): `SCRUM-72` is now In Progress in Jira. Production
and simulator EAS profiles, a public-client environment guard, permission cleanup
and an iOS bundling CI check are implemented locally. Expo Doctor passed 21/21;
mobile type-check, 224 tests and iOS export passed. The Expo CLI login now has
Owner access to `oratio_global` and `oratioglobals-team`; with user approval the app
is linked to the existing `@oratioglobals-team/oratio-global` project, verified by
EAS `project:info`. EAS client environment setup, Apple membership (`SCRUM-75`),
signing and TestFlight installation remain open.
That September audit recorded 13 moderate findings. The October security checkpoint
above supersedes it; no release waiver or cloud build was authorized. See
[IOS-BUILD-PIPELINE.md](./IOS-BUILD-PIPELINE.md).

## Map and Android snapshot

Jira sync (2026-09-28): SCRUM-71 now includes the confirmed QA evidence, including
reason-only reporting, keyboard/light-dark usability and reporter-details privacy.
It stays In Review; its incorrect Post-Launch fix version was corrected to V1 Launch.
SCRUM-94 tracks blocking separately under SCRUM-62, which is now In Progress.
SCRUM-74 is To Do and assigned to V1 Launch; its scope explicitly preserves protected
web moderation, legal/support pages and shared-link fallbacks during the landing-page
cutover. At that checkpoint SCRUM-72/75 remained To Do and SCRUM-82 remained Blocked; no Apple membership,
TestFlight distribution or translation-billing completion is assumed.
See [USER-BLOCKING.md](./USER-BLOCKING.md) for blocking scope and rollout status.

The latest reporting confirmations above are recorded locally and in Jira. They
have not yet been added to the earlier 2026-09-26 Google workbook snapshot.

Workflow configuration issue observed through Jira's transition metadata on
2026-09-28: the status named Blocked has the Done category, while the status named
Done has the To Do category. Issue status names above are accurate, but category-based
charts may misreport progress. No workflow configuration was changed in this sync.

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
