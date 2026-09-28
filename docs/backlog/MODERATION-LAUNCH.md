# Moderation Launch Follow-Up

Scope: SCRUM-71 reporting/moderation, with launch-safety gaps tracked separately
from the user-confirmed native report success and duplicate checks.

## Implemented (Updated 2026-09-24)

- Protected web queue with server-side status filtering, oldest-first pending
  reports, 25-row pages, and separate access/load/error/empty states.
- Queue freshness follow-up (2026-09-24): visible oldest/newest sorting applies
  before server-side pagination. The visible queue refreshes every 30 seconds,
  on focus/visibility/reconnection, and after returning from a review. Existing
  rows stay visible during background refresh; failures show a stale-data warning.
  Open reviews are not reloaded and decision drafts remain untouched. Sorting and
  desktop/phone-width layout were checked against the live read-only queue;
  refresh, race, failure and cleanup behavior have automated coverage.
- Report-scoped prayer/comment review, parent prayer and reply context, with no
  blanket moderator access to Circle or owner-only Private prayers. Deleted or
  newly Private targets are unavailable for inspection/enforcement but their
  reports can be dismissed with a reason.
- Explicit Hide, Dismiss, and Restore decisions with a required 3-1000 character
  reason and confirmation. Notes live in moderator-only audit records, not the
  reporter-readable reports table. These are internal decision notes, separate
  from the optional comment supplied by the reporter.
- Native and web prayer/comment reports now use reason selection, an optional
  1000-character details field, then explicit Submit. Failed requests retain the
  draft. Reporter details appear in the moderator review, follow existing report
  RLS (reporter/moderator only), and are excluded from analytics and error logging.
- Report-length feedback follow-up (2026-09-26): oversized drafts are retained
  instead of silently truncated. The form shows an excess-character message and
  disables Submit until shortened; exactly 1000 characters are valid with a
  limit-reached notice. UI counters and the shared save guard now count Unicode
  code points consistently with the existing database constraint. No migration.
- Backend-enforced hiding covers direct reads, Public/Circle/owner feeds, map
  aggregates, comments/replies, interactions, saves, and activity previews.
  Already-rendered content disappears on the next fetch; this is not remote
  erasure of a device's cached content.
- Hide resolves all pending reports for the same target in one transaction.
  Dismiss closes only the selected report without changing content visibility.
  Restore removes only that target's moderation restriction; audience and other
  restrictions still apply. Restoring does not reopen resolved reports.
- Append-only application audit history records action, reason, actor and time.
  Original content is not copied into the audit trail. Historical resolved
  reports are not retroactively hidden or assigned invented audit events.
- Database locks and reviewed-content versions reject stale/conflicting actions.
  A failed/uncertain save requires reloading before retry; the reason is retained.

## Rollout And Live QA

1. Migrations 039 and 040 were applied to Oratio_DB on 2026-09-23 with explicit
   owner approval after automated checks. The missing `get_report_review` RPC
   caused the live review-load error. The existing signed-in moderator now loads
   a real Circle report's content and decision controls successfully. No role was
   granted and no content was hidden, restored, or dismissed during this rollout.
2. Web baseline deployed on 2026-09-26: Netlify published main commit `4f6647d`
   after the report-limit update; web/mobile CI passed. Native is still tested in
   Expo Go, not a shipped TestFlight build. Authenticated production moderation
   verification remains open. Old moderation UIs
   lose direct report-update permission after the migration and fail safely;
   do not restore those grants to make an old client work.
3. Confirm the launch moderator account and review ownership with the owner.
   The currently signed-in account already has moderation access. Do not grant
   additional roles without approval, elevate shared QA accounts, or ship an admin key.
4. Sign in to `/moderate`. Verify a normal account is denied at both UI and RPC
   levels, not merely hidden from navigation.
5. With disposable public and Circle QA content, test review, hide, direct-link
   denial, map/comment/Updates refresh, restore, dismiss, and duplicate attempts
   from two moderator windows. Private content must remain unavailable.
6. Verify reporter review updates and that internal notes are never disclosed.
7. Retest the new reason/details/Submit flow for prayers and comments, including
   keyboard scrolling on iPhone, no-details submission, duplicate reports,
   offline draft retention, and details appearing only to the reporter/moderators.
8. Repeat on the deployed build and physical iPhone before closing SCRUM-71.

Verification on 2026-09-23: web/mobile tests, both type-checks, web lint and build,
and 45 local PostgreSQL assertions passed. Live review loading was confirmed
read-only in the signed-in browser; live enforcement QA remains pending.
Queue follow-up verification on 2026-09-24: 479 web tests, web/mobile type-checks,
web lint and build passed. No database, account-role, or content changes were
needed for this follow-up.

User-confirmed QA on 2026-09-24: restoring the recent public test prayer makes it
visible again to Miriam and Jonah after refreshing Expo. The report remains
Resolved and its history shows Hide and Restore. A fresh report appears in the
visible Pending / Newest reports queue within 30 seconds without manual refresh.
Dismissing that report moves it to Dismissed while the prayer remains visible in
Expo. Circle audience restoration and comment-report QA remained open at that point; these passes
do not close the broader enforcement or release-device checklist.

User-confirmed QA on 2026-09-26: a disposable Circle prayer disappears after Hide
and refreshing Expo. After Restore and another refresh, the author and accepted
Circle member can see it again while an unconnected account still cannot. The
report remains Resolved and its history records Hide and Restore. The user also
confirmed the comment-report flow was already tested: reason and optional details,
explicit Submit, success confirmation, correct content/details in moderator review,
and duplicate-report feedback. Jonah, acting as a non-moderator reporter, also
received the review outcome in Updates after Miriam dismissed a disposable report,
without seeing her distinctive internal decision note. Offline report submission
shows a clear error and retains the reason/details draft; reconnecting and retrying
succeeds without duplicates (user-confirmed). Reporter-details and other-reporter
identity privacy, form limits, no-details submission, keyboard/authentication-error
handling, and broader enforcement/release checks remain open.
These follow-ups are recorded locally and in the 2026-09-26 workbook sync below.

Report-length fix verification on 2026-09-26: 485 web tests, 190 mobile tests,
both type-checks, web lint and production build passed. Web screenshots at
1280x720 and 390x844 show readable feedback; the exact-limit state remains
submittable. Browser checks did not send reports. The build retains the existing
large-chunk warning. The user confirmed the new warning works on the physical
iPhone. Full light/dark and keyboard coverage remains open.

QA workbook sync on 2026-09-24: `Smoke Test Matrix!S32` (`MOD-002`) now includes
these dated results and a note listing the remaining native/privacy/release checks.
The release checklist records migrations through 040; the dashboard refresh date
explicitly notes this partial sync. Historical PWA results and dashboard formulas
were preserved. Separate native follow-up rows have not been added.

QA workbook sync on 2026-09-26: `Smoke Test Matrix!S30` (`REPORT-001`) and `S32`
(`MOD-002`) include the confirmed Circle, comment-reporting, internal-note privacy,
offline-recovery and iPhone limit-warning results. Their notes distinguish open
coverage from these passes. Account guidance now uses Jonah/Sofia for access-denial
checks and identifies Miriam as the existing QA moderator, not a launch account.
The partial-refresh date is updated; historical PWA statuses and formulas remain
unchanged. This does not close SCRUM-71 or constitute release sign-off.

Local checks: `node scripts/test-moderation-db.mjs` requires PostgreSQL 14+
`initdb`, `pg_ctl`, and `psql` on PATH. It creates an isolated temporary cluster,
applies every migration against minimal local Supabase auth/storage contracts,
tests real RLS and RPC behavior, then stops and removes the cluster. It never
loads project credentials or connects to live Supabase. This does not replace
hosted Supabase/PostgREST/Realtime and physical-device QA.

## Still Open Before Launch Sign-Off

Latest confirmation and Jira sync (2026-09-28): Robert confirmed reason-only
prayer/comment reports, keyboard scrolling/readability in light and dark mode,
and reporter-details isolation from authors/unrelated accounts on 2026-09-26.
Those checks are passed in `docs/QA-CHECKLIST.md` and SCRUM-71's QA comment;
the earlier open-item snapshots above are historical. Exact-boundary native
cases, authentication failures, other-reporter identity, broader enforcement
and release checks remain open. The newest confirmations are not yet resynced
to the Google workbook. SCRUM-71 stays In Review, and SCRUM-94 tracks the new
blocking implementation separately as In Progress.

- Alerting, urgency/escalation, and an owned review schedule with backup coverage.
  Do not put prayer text or reporter identity in external alert messages.
- User blocking (SCRUM-94, local implementation in progress; see
  [USER-BLOCKING.md](./USER-BLOCKING.md)), administrator enforcement for abusive
  accounts, and objectionable content filtering before publication. Validate
  against Apple Guideline 1.2.
- Clear community rules, a non-punitive support path for distress, public contact
  details, author-facing removal explanations, and an appeal/contact process.
- Decide audit retention and moderator access-review/revocation policy.
- Group reports into a single queue case with counts; currently related reports
  close together on Hide but still appear as individual rows before review.

Apple reference: https://developer.apple.com/app-store/review/guidelines/#user-generated-content
