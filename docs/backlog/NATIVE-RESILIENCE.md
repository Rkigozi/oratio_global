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

- [ ] Load Public/Circle, disconnect while keeping the app open, refresh, reconnect
      and Retry. Verify errors are distinct from empty success and navigation stays usable.
- [x] Private-prayer offline submission and reconnect/retry smoke check
      (maintainer-reported, 2026-10-27; checkpoint above).
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
- [ ] On the current SDK 58.0.21 candidate, submit a synthetic comment/reply/note,
      report and Circle invite/response under interruption. Verify retained intent,
      locked controls and explicit recovery. Controlled lost-confirmation injection
      is separate from simply submitting while already offline.
- [ ] Repeat recovery for pray/save, prayer edit/delete/renew and profile/settings;
      verify no extra memberships/counts, restarted expiry or replaced drafts.
- [ ] Check recovery notices and edit/report sheets with keyboard, both themes
      and larger text. Do not treat unit-render assertions as device layout proof.
- [ ] Record candidate SHA/build, iPhone/iOS, conditions and results before closure.

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
