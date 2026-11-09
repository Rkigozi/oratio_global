# Native Network And Session Resilience

Jira: `SCRUM-95` (In Progress, 2026-10-30).
Acceptance source: [NFR-02/03](../NFR-CHECKLIST.md). Parent design:
[identity](../design/lld/IDENTITY-AND-ACCESS.md) and
[prayer/discovery](../design/lld/PRAYERS-AND-DISCOVERY.md).

## Outcome And Boundary

Keep core mobile reads and write actions recoverable during interruptions,
without presenting failed reads as empty success or duplicating an uncertain
submission. Clear account-scoped navigation and drafts when the session changes.

The current checkpoint is tracked on `codex/ios-launch-readiness` in
[draft PR #5](https://github.com/Rkigozi/oratio_global/pull/5), following `1c197a6`.
It includes the separately approved report-ID grant in migration 046. It does not
complete SCRUM-95 or either NFR. No website deployment, signed build or load test
is included.

## Implemented Contracts

### Bounded Requests And Reads

The native Supabase adapter supplies an 18-second fetch deadline, forwards caller
cancellation and requests abort on timeout. The wrapper settles even if a platform
transport ignores abort. It does not automatically retry requests. Abort is not
evidence that a server rolled back a write.

Feed, hotspot/location-page, prayer-detail, profile and authentication operations
also have logical deadlines, so sequential SDK requests cannot indefinitely hold
those loading views. Initial session restore retains its existing five-second
deadline. Prayer submission shares its 18-second budget between the final Circle
check and the write; an exhausted preflight budget cannot start a new write.
These timer/unit results are not measured physical-device timing acceptance.

Native feed queries explicitly request errors instead of the shared helper's
legacy empty-array fallback. Initial failure shows Retry; a genuine empty response
retains the empty state. Failed refresh preserves loaded rows with a retry warning;
failed next-page loading preserves rows/cursor and requires explicit retry.
Request generations ignore responses superseded by refresh, filters or blur.
Prayer detail distinguishes missing/inaccessible data from a failed read and
offers retry; a previous route's result cannot replace the current prayer.

### Account Boundaries

Auth/profile generation guards reject late profile reads and stale initial session
restoration. Changing identity immediately clears the previous profile. An old
account's token-refresh event cannot restore that account after sign-out or replace
a different current identity. Explicit profile refresh follows the same guards.

The activity/navigation subtree is keyed by authenticated user ID. Account change
or sign-out remounts it, discarding previous navigation, list, composer and activity
state. This is not remote erasure of device storage or instantaneous knowledge of
a relationship/access revocation while disconnected.

Sign-out clears visible user/profile state before the SDK request and uses local
scope: this device's session, not a request to sign out all other devices. Sign-in
is gated while sign-out finishes. Rejected/stalled sign-in returns recoverable
feedback; uncertain sign-up/reset feedback advises checking email before repeating
an email-producing action.

### Uncertain Prayer Submission

The composer assigns a native UUID once per submission attempt and supplies the
originating account ID. Shared queries verify the current account, insert with
that primary key and never upsert/overwrite an existing prayer. The existing
database primary key is the duplicate barrier; no new migration is required.

An explicit first-attempt database rejection permits editing and a new attempt.
An HTTP status alone does not prove rollback: failed write representations and
opaque client-error responses retain uncertainty. A timeout
or ambiguous write result preserves the original ID, draft, audience and settings;
the composer locks those fields and offers **Check and retry submission**. Retry
first checks the owner-scoped row. A matching committed row confirms success
without another insert; an absent row allows an insert with the same ID. A racing
unique-key conflict is reconciled by the same owner-scoped read. An unreadable or
conflicting row never becomes a claimed success. Failed verification retains
uncertainty and the same ID, even if the retry failure itself appears definite.

This protection is scoped to the open composer. There is no persistent offline
write queue or force-quit/reload recovery guarantee. After leaving an unresolved
composer, inspect My Prayers before starting another submission. Other native
actions use the explicit recovery contracts below; a transport timeout alone
does not make a write safe to repeat.

The 2026-10-21 checkpoint added `expo-modules-core` directly at its already-resolved
57.0.21 version for the native UUID API. The
[SDK 58 upgrade](./IOS-BUILD-PIPELINE.md#sdk-58-development-upgrade-2026-10-26)
uses the public `expo` UUID export and removes that direct dependency. The
same-ID submission contract is unchanged.

### Recovery For Other Mobile Actions (2026-10-30)

The native recovery hook locks synchronously before dispatch, retains one UUID,
originating account and immutable intent, and gives authentication/preflight/write
one 18-second budget. A definite first rejection releases the form; an ambiguous
result locks it and offers **Check and retry**. Verification failure keeps the
original intent. Account/target changes and unmount cancel pending work and ignore
late results; no delayed preflight may start a write after its budget/cancellation.
These are opt-in shared-query options used by native callers. Existing supporting
web callers retain their previous API signatures and behavior.

| Action                       | Recovery contract                                                                                                                                                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comment/reply/Private note   | Insert the original UUID. Retry verifies owner, prayer, parent and body; a racing primary-key conflict is reconciled without an upsert.                                                                                                              |
| Comment edit/delete/settings | Edits compare the original `updated_at`; delete requires an acknowledged ID, or retry resolves that the row is no longer visible. Comment visibility uses the original desired value.                                                                |
| Report                       | Insert the original UUID. Retry verifies reporter, target, reason and details even after moderation resolves it. Existing pending-report uniqueness still applies.                                                                                   |
| Circle invitation/response   | New invites retain their UUID. Accept/decline/cancel first inspect the original invite status, so an already applied action does not repeat a non-idempotent RPC. A different terminal status is refreshed as a changed result.                      |
| Circle removal               | Retry targets only the original connection-row ID; it cannot remove a newly established replacement connection.                                                                                                                                      |
| Pray/save                    | Reconcile the original desired membership rather than toggling. Existing unique constraints prevent duplicate memberships. Prayer totals are read from the server after acknowledgement, not incremented again during recovery.                      |
| Prayer edit/delete/renew     | Edits compare original text and edit timestamp. Deletion requires a returned ID; an absent retry row means unavailable, not proof of erasure by this attempt. Renewal checks the original archive and skips the RPC if the prayer is already active. |
| Profile/settings             | Profile fields compare the original displayed values. Preference writes require a successful read, retain unrelated keys and compare the exact JSON before updating. Failed reads cannot write default preferences over existing data.               |
| Uploaded photo profile URL   | Retain the selected URL while checking the profile update; retry does not reopen the picker/upload again. Verify the originating account after the OS picker and before saving the URL.                                                              |

Comments, Circle membership/invites, username search, profile details/count lists
and preference reads now distinguish failure from genuine empty/default success.
Read retries preserve already loaded rows and current drafts; superseded results
cannot replace the current account/target. Search has its own explicit retry.

This protection lasts only while the action's component remains mounted. There
is no durable operation ledger or offline queue, and no cross-device exactly-once
guarantee if another device deletes/undoes an action between checks. Inspect the
saved result before repeating an unresolved action after leaving/reloading. Avatar
storage upload itself, account deletion and block/unblock remain separate provider
or action checks; saving a known photo URL is not resumable storage-upload proof.

### Approved Report-ID Rollout (2026-10-30)

The disposable SQL tests first exposed that the existing column grant excluded
`reports.id`. Migration [046](../../supabase/migrations/046_report_retry_ids.sql)
adds only `INSERT(id)` for `authenticated`; it changes no rows or RLS policy.
Following explicit approval, the linked CLI dry run listed only 046, then applied
it to Oratio_DB (`tfwgoavbbudkxthjhnrx`). Metadata postchecks confirmed one migration
history entry, enabled RLS, an unchanged report-policy fingerprint, allowed ID
insertion, and denied ID updates/status inserts/status updates. Synthetic role,
duplicate and ownership assertions ran only in the disposable cluster; no live
user report was created for this rollout. The applied migration is immutable.

## Verification

Current local checkpoint (2026-10-30, working tree based on `1c197a6`): 390 mobile
tests across 35 suites and 717 web/shared tests across 56 files pass, including
new recovery-hook, screen and shared-query regressions. Both type checks, web
lint/build and iOS JS/Hermes export pass. The disposable database applies all
migrations and passes 261 assertions (23 new mobile-write assertions) plus the
existing 11 concurrency scenarios. Security source/policy tests pass (172);
`audit:mobile` passes under the existing exact-version development approval while
reporting 3 high/5 low findings. The strict release policy remains separate.
Repository formatting and current-candidate hosted checks are recorded with PR #5;
local test success is not physical-device acceptance or whole-NFR sign-off.

- [Native recovery hook](../../apps/mobile/src/hooks/use-recoverable-write.test.ts):
  repeated taps, retained ID/intent, definite versus uncertain failure, deadline,
  cancellation, account/target replacement and ignored late responses.
- [Shared action regressions](../../apps/web/src/app/services/write-recovery.test.ts):
  lost confirmations, same-ID recovery, desired states, comparison guards,
  failed strict reads, report details and owner-scoped conflict handling.
- [Mobile retry SQL](../../supabase/tests/mobile-write-retries.sql): primary-key
  and membership uniqueness, reporter privacy after resolution, invite recovery,
  impersonation denial and protected report column grants.

### Earlier Checkpoints

The 2026-10-23 review adds regressions for failed write representations
(`PGRST116`/406), opaque 400/403 responses and recovery using the original ID.
The web theme tests now settle asynchronous imports before teardown.
The earlier candidate checks and then-unresolved dependency gate are recorded in
the [security follow-up](./SECURITY-REVIEW.md#dependency-review-follow-up-2026-10-23).
The [October 30 approval](./SECURITY-REVIEW.md#approved-zod-development-exception-2026-10-30)
supersedes that development gate state; release treatment remains open.
Draft PR #5 identifies revisions and hosted checks; local test success does not
mean all CI, device or release gates passed.

Automated checkpoint (2026-10-21): 368 mobile tests across 33 suites and 645
web/shared tests across 55 files passed. Both type checks, web lint/build,
formatting and a clean CI-style iOS JS/Hermes export passed. The disposable
database applied all existing migrations and passed 238 assertions, including 12
new submission-retry assertions, plus the existing 11 concurrency scenarios.
The existing Forge backport verified; this is not a fresh dependency-audit or
strict release-security sign-off. Markdown file targets and all eight unchanged
NFR acceptance targets/gates were checked. These are local results, not hosted CI
or physical-device acceptance.

- [Deadline/abort tests](../../apps/mobile/src/services/request-timeout.test.ts):
  blackholed promises, late success, timer cleanup and caller-signal composition.
- [Feed hook tests](../../apps/mobile/src/hooks/use-feed.test.ts) and
  [native feed tests](../../apps/mobile/src/screens/feed.test.tsx): retry, retained
  rows/cursor, repeat events, filter/refresh races and error UI.
- [Auth races](../../apps/mobile/src/hooks/auth-context.test.tsx) and
  [account-boundary test](../../apps/mobile/src/navigation/account-boundary.test.tsx):
  profile/session reordering, sign-out and state remounting.
- [Composer tests](../../apps/mobile/src/screens/submit.test.tsx) and
  [shared query tests](../../apps/web/src/app/services/network-resilience.test.ts):
  lost confirmation, late success, same-ID retries, definite/uncertain failures,
  account mismatch and owner-scoped conflict recovery.
- [Database retry assertions](../../supabase/tests/prayer-submission-retries.sql):
  authenticated Public/Circle/Private retries cannot add or overwrite a row,
  restart expiry, claim another account's prayer or impersonate its owner.
  These run only in the disposable `npm run test:db` cluster.

## Device Acceptance

Use synthetic test prayers and the latest Expo Go candidate. Do not inject faults,
seed bulk data or change access policies on the shared live backend.

Reported checkpoint (2026-10-27, **maintainer-reported**): the SDK 58 project
opened in iOS Expo Go and the previously outlined Private-prayer
disconnect/submit/reconnect/retry test passed. Candidate: local working tree
based on `a3e755a` with the uncommitted SDK 58 upgrade. Exact iPhone/iOS,
per-step timings and independent saved-row evidence were not recorded.
This confirms the reported offline/reconnect smoke journey, not a controlled
write-committed/confirmation-lost fault or whole NFR acceptance.

Account-switch checkpoint (2026-10-29, **maintainer-reported**): signing out of
Jonah and signing in as Miriam on the same iPhone showed Miriam's profile and
only Miriam's Private prayers. Candidate: the same local `a3e755a` working tree
with the uncommitted SDK 58 upgrade. Exact iPhone/iOS and independent screen
evidence were not recorded. Composer drafts, activity, navigation and delayed
old-account responses/token refreshes remain separate acceptance checks.

Comment recovery checkpoint (2026-11-01, **maintainer-reported**): on iPhone in
Expo Go, a synthetic public-prayer comment was submitted after disabling Wi-Fi
and mobile data. The outlined check passed: the draft stayed visible with
failure/recovery feedback, and reconnecting/retrying produced one comment and
cleared the draft after confirmation. Candidate: `b544e4a`, served by the restarted
Metro instance with that revision verified in its manifest. Exact iPhone/iOS,
elapsed timing and independent database-row evidence were not recorded. This is
offline-before-submit recovery only; replies/Private notes, reports, Circle
actions and committed-write/lost-confirmation injection remain separate checks.

Report recovery checkpoint (2026-11-02, **maintainer-reported**, R1): on the
`b544e4a` iPhone Expo Go candidate, the outlined public-prayer report test passed.
The selected reason and synthetic details remained after submitting offline;
reconnecting/retrying displayed the report confirmation. A separate read-only
Oratio_DB aggregate on 2026-11-02 matched one pending report and one distinct
reporter/target pair for the exact synthetic details `QA offline report test`
within that UTC day. This confirms delivery/count for that matched fixture, not
all reports or a committed-write/lost-confirmation fault. No live rows were
changed by the verification. Exact iPhone/iOS and elapsed timing were not
recorded. A prayer-loading interruption cleared during the same session; its
cause was not established or independently reproduced.

Circle recovery checkpoint (2026-11-02, R2/R3, **maintainer-reported** with
separate backend observation): the invite/cancel portion of the outlined
`b544e4a` Expo Go recovery flow passed. Read-only Oratio_DB checks then found
two new invitations in that UTC day: one cancelled and one pending, with no
accepted invitation updated in that window. The pending `qa_miriam` to `qa_jonah`
invitation has a cancelled predecessor for the same direction and no current
connection between the pair. This corroborates creation/cancellation and the
replacement invitation; R4 acceptance and R5 removal were still open at that
earlier checkpoint. Exact
iPhone/iOS, per-action timings and controlled lost-confirmation evidence were
not recorded. These verification queries changed no database rows.

Circle completion checkpoint (2026-11-02, R4/R5, **maintainer-reported** with
separate backend observation): the recipient completed the outlined accept/remove
offline/reconnect/retry checks on the `b544e4a` Expo Go candidate. A subsequent
read-only Oratio_DB query for the identified `qa_miriam`/`qa_jonah` pair found
two test invitations in that UTC day: one cancelled, one accepted, no pending
invitations and no current connection. This corroborates the accepted invitation
and final removal state for the fixture. R2–R5 are recorded as passed for this
phone smoke pass. Exact iPhone/iOS, per-step timings and controlled
committed-write/lost-confirmation proof remain unrecorded; this is not whole-NFR
acceptance. Verification changed no live rows.

Delegated device checkpoint (2026-11-02, R10/R11, **agent-operated**): the
`b544e4a` Expo Go app was operated on the physical iPhone through iPhone
Mirroring. Temporary development-runtime fetch adapters simulated a backend
outage and then deliberately rejected a successful write's confirmation. Device
Wi-Fi/cellular radios stayed connected so Mirroring remained usable. These are
controlled request-fault results, not literal radio-disconnection results.

- Profile (R10): the draft survived the failed save. After one committed bio
  update lost its confirmation, the app displayed the recovery notice; Check and
  retry confirmed the saved value with no second test update.
- Settings (R11): an outage produced explicit failure feedback and restored the
  prior System selection. A committed Light preference with a lost confirmation
  retained Light and displayed recovery; Check and retry confirmed it without
  another test update. Visible unrelated preferences remained unchanged.
- Cleanup: the original QA bio and System appearance were restored. A separate
  read-only Oratio_DB query verified the exact original bio, System theme, Auto
  language and the three original enabled notification/comment defaults.
- Automated support rerun: 66 native tests across four selected screen/hook
  suites, 68 shared-query tests, and 261 disposable database assertions plus 11
  concurrency scenarios passed. Existing tests were rerun; these are distinct
  from the observed device results.

No app source, dependency, migration or deployment changed for this testing.
Fault mode was returned to online; the temporary adapter also had a five-minute
automatic restoration timer. When the handset became unavailable at the stop
request, a standard Expo reload was requested to discard the runtime adapter.
Verify a fresh, uninstrumented runtime when resuming. Exact iPhone model/iOS,
measured timing and a full device matrix were not recorded.

The phone pass paused at the maintainer's request on 2026-11-02. The following
checkpoint records its resumption; the automated rerun did not pass unrun cases.

Prayer recovery checkpoint (2026-11-04, R6–R9, **agent-operated**): the
`b544e4a` Expo Go app was operated on the physical iPhone through Mirroring.
The reopened runtime was checked for, and had no remaining, November 2 fault
adapter. A new temporary development-runtime adapter simulated backend failure
before a write and a lost confirmation after a successful write. Radios stayed
connected. Only method/resource counters were collected; no request bodies,
credentials or private user content were recorded.

- R9: the existing archived Public fixture `Expiry QA just testing`
  (`c21aee55-3d8b-4330-8044-0f8ff776ee31`) remained archived after the failed
  request. One successful renewal RPC lost its confirmation; Check and retry
  recognised the saved expiry without another RPC. The same prayer/history entry
  became active until `2026-11-18T18:54:19.444038Z`. Reopening and a separate
  read-only backend check confirmed that expiry had not restarted.
- R6: Pray and Save each retained their original state with explicit failure
  feedback during the outage. Each successful membership insert then lost its
  confirmation and displayed recovery. Check and retry confirmed the intended
  state without another insert. The displayed Pray total changed from zero to
  one. Both memberships were subsequently restored to their original absent
  state through the app; a separate read-only check confirmed zero Pray rows and
  no owner bookmark for this fixture.
- R7: a new, explicitly disposable Private QA prayer was created through the
  app. Its edited draft remained after a failed save. One successful PATCH lost
  its confirmation; recovery retained the locked text and then displayed the
  saved edit without a second PATCH.
- R8: deletion of that disposable fixture failed visibly while the backend was
  unavailable. One successful DELETE then lost its confirmation. Check and retry
  made no second DELETE, returned to My Prayers and displayed **Prayer unavailable**.
  The fixture was absent and the original Private prayer remained. A separate
  read-only query confirmed no matching November 4 disposable fixture remained.

The adapter recorded five dropped successful confirmations: one renewal, Pray,
Save, edit and delete. Cleanup restored both original fetch adapters, followed
by an explicit `installed: false` runtime check. No app source, dependency,
migration or deployment changed. Exact iPhone model/iOS, measured timings,
concurrent-edit races and a full device matrix were not recorded. These are
controlled request-fault results, not literal radio-disconnection acceptance.
Account/session cases R12–R13 remained open at this prayer checkpoint; the
following checkpoint records their subsequent results.

Session-isolation checkpoint (2026-11-04, R12–R13,
**agent-operated**): on the same physical iPhone in Expo Go, Jonah's activity
was loaded and a distinctive synthetic composer draft was entered without
submission. Normal navigation left the composer to access Settings; sign-out
and sign-in as Miriam returned to the main Public journey. Miriam's composer
was empty, Profile showed her identity, My Prayers showed her own Private
fixture, and Updates showed her activity rather than Jonah's previously loaded
list. This passes R12 and the account-switch/activity portion of R13; it does
not exercise forced sign-out while a composer is mounted or delayed old-account
responses/token refreshes.

For R13 startup testing, Expo Go was closed by dismissing its app-switcher card;
the inspector then had zero Expo targets. A temporary development-only bootstrap
installed the same backend-fault adapter before React registered the root app.
Reopening Expo Go and Oratio retained the signed-in session and displayed
explicit feed/profile failures with Retry/Refresh profile controls, without
showing Jonah's identity or rows. The bootstrap recorded 22 blocked requests and
zero successful writes. Both fetch adapters were restored and `installed: false`
was verified. The original entry file was restored byte-for-byte and the
temporary bootstrap removed. Testing then paused before the final online screen
could be confirmed.

At resume later on November 4, Metro was restarted with the same candidate and
Expo account. Oratio reopened online, loaded its Public feed and displayed
Miriam's correct profile after navigating to Me. The runtime again reported
`installed: false`. This completes the grouped R13 recovery check. The online
confirmation followed the pause and reopening; it is not evidence of an
uninterrupted in-place Retry sequence or a measured recovery time.

The November 4 runtime reported iOS `26.6.1` and candidate
`b544e4a4c807d2e5c701550677983b02a9f2ad24`; exact iPhone model and measured
timings were not captured. Backend-fault injection kept radios connected and
is distinct from a radio-disconnected cold launch. No source change from the
temporary harness remains, and no dependency, migration or deployment changed.

Read-recovery and accessibility follow-up (2026-11-04, **agent-operated**):
Miriam's QA account was used on the same physical iPhone through Mirroring.
Temporary development-runtime backend faults kept radios connected. The Public
Saved filter showed a connection error and Retry during failure, then the
genuine **No saved prayers yet** result after connectivity returned. Circle
showed the failure state and recovered its four QA prayers through Retry.
Opening the identified Public expiry fixture during failure showed a connection
error with Try again and Back; Try again subsequently loaded the correct prayer.
These observations do not cover retained-row refresh, pagination or late-response
races. The attempted mirrored pull-to-refresh did not establish a refresh event
and is not counted as a passing check.

The review found that Settings only offered read retry when no preferences had
loaded. A regression test reproduced the missing button after a later focus
read failed. The local fix separates read errors from write errors, retains
loaded preferences, and offers Retry settings for either initial or subsequent
read failure. The retry control has a minimum 44 pt height and error text has
an accessibility alert role. Tests cover both failure paths without preference
writes. After a full Expo reload, the phone displayed the revised Settings
failure/retry control; Retry restored the visible System/Auto and notification
preferences without changing them. Both fault-adapter sessions recorded zero
successful writes; adapters were restored and `installed: false` was verified.

Accessibility code review also identified the editor's unbounded form as a
keyboard/large-text overflow risk. The local editor now caps its sheet height
and scrolls the text, validation, recovery and action controls. Save changes
retains an accessible name while its spinner is shown and exposes busy/disabled
state; validation exposes an alert role. A pending-save screen test verifies
the named disabled control, retained input lock and one saved result. The
updated editor was opened and cancelled on the phone in dark mode at its current
text setting, with input and both actions visible. No prayer edit was submitted
for that visual check. This is not a software-keyboard, VoiceOver, maximum
Dynamic Type or light-theme layout pass; those remain under `SCRUM-96`.

Candidate: working tree based on `b544e4a` plus the Settings/editor fixes and
three regression tests. Final local results: 393 native tests / 35 suites,
mobile type-check, changed-file formatting and diff whitespace checks passed.
No shared/backend/dependency change, deployment or signed-build acceptance is
implied. `SCRUM-95` and `SCRUM-96` remain In Progress.

The later November 4 contrast/maximum-text follow-up, its 401-test source
checkpoint and cleanup are recorded separately in
[native accessibility](./NATIVE-ACCESSIBILITY.md). The 393-test result above
belongs to this earlier read-recovery checkpoint.

- [ ] Load Public/Circle, disconnect while keeping the app open, refresh, reconnect
      and Retry. Verify errors are distinct from empty success and navigation stays usable.
- [x] Private-prayer offline submission and reconnect/retry smoke check
      (maintainer-reported, 2026-10-27; checkpoint above).
- [x] Public comment offline-before-submit draft retention and reconnect/retry
      smoke check (maintainer-reported, 2026-11-01; `b544e4a`; checkpoint above).
- [x] Public-prayer report offline-before-submit reason/details retention and
      reconnect/retry confirmation (R1, maintainer-reported, 2026-11-02; `b544e4a`).
- [x] Circle invite/cancel offline/retry portion (R2/R3, maintainer-reported,
      2026-11-02; `b544e4a`), with creation/cancellation corroborated by a separate
      read-only check.
- [x] Circle accept/remove offline/retry portion (R4/R5, maintainer-reported,
      2026-11-02; `b544e4a`), with the accepted invite and final removal state
      corroborated by a separate read-only check of the identified QA pair.
- [x] Profile and preference recovery under controlled backend outage and
      committed-write/lost-confirmation faults (R10/R11, agent-operated physical
      iPhone through Mirroring, 2026-11-02; `b544e4a`); original values restored.
- [x] Pray/save and prayer edit/delete/renew recovery with controlled backend
      outage and successful-write/lost-confirmation faults (R6–R9,
      agent-operated physical iPhone through Mirroring, 2026-11-04; `b544e4a`);
      memberships restored and disposable fixture deleted, as recorded above.
- [ ] Separately inject a committed-write/lost-confirmation fault in a controlled
      environment; verify locked intent and Check and retry submission confirm
      one matching prayer only.
- [x] Jonah-to-Miriam sign-out/sign-in shows only the new account's profile and
      Private prayers (maintainer-reported, 2026-10-29; checkpoint above).
- [ ] Repeat account switching with a composer draft and activity open. Verify
      navigation, draft and activity state reset; delayed old-account responses
      and token refreshes cannot restore previous-account state.
- [ ] Verify read/submission recovery on slow/blackholed connections and through
      background/foreground transitions in a controlled test environment.
- [ ] On the committed candidate identified in the [build runbook](./IOS-BUILD-PIPELINE.md), submit a synthetic comment/reply/note,
      report and Circle invite/response under interruption. Verify retained intent,
      locked controls and explicit recovery. Controlled lost-confirmation injection
      is separate from simply submitting while already offline.
- [x] Core pray/save, prayer edit/delete/renew and profile/settings recovery
      under controlled request faults (R6–R11, dated checkpoints above); no
      duplicate test writes, restarted expiry or replaced drafts were observed.
- [x] Public Saved, Circle and prayer-detail initial read failure/retry smoke
      checks, plus revised Settings initial-read retry (agent-operated,
      2026-11-04; follow-up above). The cached-preference refresh regression is
      covered by a focused screen test, not a matching device focus walkthrough.
- [ ] Verify concurrent-edit/expiry races and the wider action/provider matrix;
      the grouped recovery pass does not cover these cases.
- [ ] Check recovery notices and edit/report sheets with keyboard, both themes
      and larger text. Do not treat unit-render assertions as device layout proof.
- [ ] Record candidate SHA/build, iPhone/iOS, conditions and results before closure.

### Grouped Expo Go Checklist (2026-11-01)

This is one grouped phone recovery pass on `b544e4a`. Public-comment and
Private-submission smoke passes above are reused. Record results together using
the case IDs below; a successful group does not imply unrun cases passed.

Use QA accounts and synthetic content. Identify a spare QA relationship and an
existing archived public test prayer before starting. If a prerequisite is
unavailable, mark that case **unavailable** and continue; do not alter real content
or a database expiry to manufacture it. Record iPhone model/iOS once for this pass.

For each write case, load its screen online, enter/select the intended change,
disable both Wi-Fi and mobile data, then act. Allow up to 20 seconds for feedback.
Text drafts should remain. A definite rejection may restore the previous setting;
an uncertain result should lock the original intent and offer **Check and retry**.
Reconnect and use that button if present, otherwise retry the original action
once. Verify the final result after reopening/refreshing its screen. These are
offline-before-write checks, not controlled lost-confirmation fault injection.

The delegated R6–R11 results above instead use controlled runtime request faults,
including lost confirmation after a successful write. Their method is recorded
explicitly; no radio-disconnection or wider device-matrix pass is inferred.

| Group / case          | Phone check and expected result                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reports — R1          | **Passed, maintainer-reported 2026-11-02; matched-fixture delivery/count verified separately; checkpoint above.** On another QA account's unreported public test prayer, select Something else and enter synthetic report details. Offline submission retains reason/details with feedback; reconnect/retry confirms the report was saved.                                                                 |
| Circle — R2           | **Passed, maintainer-reported 2026-11-02; backend state corroborates creation; checkpoint above.** Invite a QA account outside the Circle with no pending invite. Recovery ends with one pending invite, not repeated invitations.                                                                                                                                                                         |
| Circle — R3           | **Passed, maintainer-reported 2026-11-02; cancellation verified separately; checkpoint above.** Cancel that pending test invite using the offline/retry pattern. The final status clears it and does not offer an opposite response while uncertain.                                                                                                                                                       |
| Circle — R4           | **Passed, maintainer-reported 2026-11-02; accepted invitation verified separately; completion checkpoint above.** Send a fresh test invite online, sign in as its recipient and accept using the offline/retry pattern. Both accounts show one mutual connection.                                                                                                                                          |
| Circle — R5           | **Passed, maintainer-reported 2026-11-02; final connection absence verified separately; completion checkpoint above.** Remove that test connection using the offline/retry pattern. Refresh both accounts and confirm the connection is gone.                                                                                                                                                              |
| Prayer actions — R6   | **Passed with controlled request faults, agent-operated 2026-11-04; prayer recovery checkpoint above.** On a public test prayer, recover a Pray action and then a Save action. Each final state matches the intended action; retry does not add another individual response/count.                                                                                                                         |
| Prayer ownership — R7 | **Passed with controlled request faults, agent-operated 2026-11-04; prayer recovery checkpoint above.** Edit an owned test prayer offline. Keep the new text after failure; reconnect/retry and reopen to confirm it saved.                                                                                                                                                                                |
| Prayer ownership — R8 | **Passed with controlled request faults, agent-operated 2026-11-04; prayer recovery checkpoint above.** Delete an owned throwaway test prayer offline. It stays recoverable until reconnection; after retry it is absent from My Prayers, with no incorrect live/submitted message.                                                                                                                        |
| Prayer ownership — R9 | **Passed with controlled request faults, agent-operated 2026-11-04; prayer recovery checkpoint above.** Renew an existing archived public test prayer offline. Recovery makes that same history entry active for its renewed window; an active prayer cannot be renewed repeatedly to restart the clock.                                                                                                   |
| Profile — R10         | **Passed with controlled request faults, agent-operated 2026-11-02; delegated checkpoint above.** Change a QA profile bio offline. The draft stays after failure; reconnect/retry and reopen to confirm the new bio.                                                                                                                                                                                       |
| Settings — R11        | **Passed with controlled request faults, agent-operated 2026-11-02; delegated checkpoint above.** Change one appearance/update preference offline. Feedback distinguishes rejection/uncertainty from a confirmed save. Reconnect/retry, reopen Settings and confirm the intended value and unrelated preferences. Restore the original preference afterward.                                               |
| Session cleanup — R12 | **Passed through normal sign-out/sign-in, agent-operated 2026-11-04; session-isolation checkpoint above.** Leave a composer draft in account A, sign out and sign in as B. The composer is clear, and Profile/My Prayers show only B's identity and Private content.                                                                                                                                       |
| Session cleanup — R13 | **Passed with normal account switching and controlled startup backend outage, agent-operated 2026-11-04; online confirmation after the pause, checkpoint above.** Repeat the account switch after viewing A's activity. B must not inherit A's activity/navigation. With B signed in, fully close/reopen offline: show B's permitted local state or a recoverable failure, then load B after reconnection. |

Complete each group and send its case results together, for example
`R1 pass; R2–R5 pass; R6 fail — spinner stayed; R9 unavailable`. Keep failures and
unavailable cases open. Other themes/keyboard/accessibility checks, reply/note
variants, controlled delayed/committed-write faults and provider-specific cases
remain separately tracked; this grouped smoke pass does not sign off SCRUM-95.

## Remaining SCRUM-95 Work

- Finish the remaining provider/action cases (avatar storage upload, account
  deletion and block/unblock), and complete the physical-device fault/action matrix.
- Verify SDK/auth-lock, token persistence, access revocation and realtime/cache
  boundaries on the agreed physical-device matrix, including cold reopen offline.
- Measure signed-build action feedback, recovery, startup and first-data budgets;
  simulated timer assertions and Expo Go are not those measurements.
- Prepare and run the approved bounded synthetic staging baseline from the NFR
  protocol. No live-user database load test is authorized by this checkpoint.
- Pass hosted candidate CI and attach device evidence. The development dependency
  gate uses the approved, expiring exact-version policy; release treatment is open.

Accessibility remains separately owned by `SCRUM-96`. TestFlight starts only after
mobile development acceptance, distribution approval and active Apple membership.
