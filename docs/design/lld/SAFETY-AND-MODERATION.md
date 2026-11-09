# LLD: Safety And Moderation

Last reviewed: 2026-10-20. FR-08; NFR-01/02/07. Parent: [HLD](../../ARCHITECTURE.md).
Owners: `SCRUM-71` reporting/moderation, `SCRUM-94` blocking, `SCRUM-47` security.

## Access Boundaries And Records

`reports` stores target type/ID, reporter, reason, optional reporter details,
status and resolution metadata. Reporters can read their own reports; explicit
moderators can access the queue. Internal decision notes are stored in
`moderation_actions`, not the reporter-readable report row. `moderated_content`
records currently hidden targets. Clients cannot directly write enforcement or
audit rows and cannot promote themselves with profile updates.

Moderation is report-scoped. `get_report_review` may inspect a reported Public
or Circle prayer/comment and relevant parent context without ordinary Circle
membership. It does not grant a moderator an unrestricted Circle/private library.
Deleted or newly Private targets are unavailable for inspection/enforcement;
their reports may still be dismissed with a reason.

Personal blocks are different: `user_blocks` is owned by the blocker, reveals
only their own block records and does not notify the other account or grant
moderator authority. Operational notice admins are a third, separate authority.

## Reporting Contract

Native and web report forms use reason selection, optional details, then explicit
Submit. Details are trimmed and limited to 1000 Unicode code points, matching
PostgreSQL `char_length`, not UTF-16 code units. An oversized draft remains
editable with an excess message and disabled Submit; exactly 1000 is valid.

`createReport` returns `created`, `already_reported`, `unauthenticated`,
`setup_required` or `failed`. A pending duplicate is checked before insertion
and also prevented by a partial unique index, so a race cannot create duplicate
pending reports for the same reporter/target. Insert identity and target access
are checked by RLS; a UI-known ID does not authorise reporting inaccessible data.

Failure retains the draft. Missing schema support for details is setup-required,
not false success. Insert-error logging omits rejected-row data that could include
reporter text. Reports are not automatically emailed to an operator; review is
through the protected queue, with staffing/escalation still an operational gate.

## Queue And Review State

The web `/moderate` route checks session and moderator status, then reads server-
filtered pages (25 rows), with oldest/newest sort applied before paging. Pending
defaults oldest first. Queue refresh runs every 30 seconds while visible and on
focus/reconnection/return from review. Background refresh retains existing rows
and warns if stale; it does not overwrite an open review or decision draft.

`get_report_review(p_report_id)` returns availability, hidden state, content/
parent context, current version and action history. Missing migration, missing
report, denied access and service failure are distinct recoverable errors in the
shared adapter. Moderator UI restrictions are not the final authorisation layer.

| Decision | Preconditions                                                             | Transactional Outcome                                                                  |
| -------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Hide     | Moderator, available non-private target, pending report, matching version | Add hidden record; resolve all pending reports for that target; append action/reason   |
| Dismiss  | Moderator, pending selected report, matching version                      | Dismiss only that report; do not alter content visibility; append action/reason        |
| Restore  | Moderator, available hidden target, matching version                      | Remove only the moderation restriction; preserve resolved status; append action/reason |

`moderate_report` requires a trimmed 3-1000-character decision reason, serialises
by target, locks the relevant rows and rejects stale versions (`40001`). On an
uncertain save, reload before another decision; retain the reason. Hide/restore
of comments refreshes visible comment counts. Audit content is action/reason/
actor/time, not copied prayer text. Normal clients cannot rewrite audit history.

Restore never bypasses audience, blocks or public expiry. Hidden parent comments
also hide their reply context. Already-rendered device content disappears on the
next authorised refresh, not through a remote erasure guarantee.

## Blocking And Quotas

`block_user(p_user_id)` requires the caller and another existing account. Under
ordered profile locks it creates a caller-owned block, cancels pending invites,
removes accepted Circle connections and legacy follows. Reads restrict blocked
profiles/prayers/comments/replies/interactions/activity and saved-target access
in either direction. Direct writes cannot recreate a blocked relationship.

`unblock_user` deletes only the caller's block and does not restore membership.
`get_blocked_accounts` returns the caller's list in capped 50-row pages. Profile
actions use an overflow sheet; management is in Settings/Blocked Accounts.

Migration 042 keeps `check_rate_limit(uid, action, max_count, window_seconds)`
compatible with RLS but rejects supplied identities other than `auth.uid()` and
parameters other than 10 prayer creations or 30 comment creations per 3600 seconds.
Same-user/action quota consumption is transaction-serialised; failed transactions
roll back their slots. Direct client access to `rate_limits` is revoked. Waitlist
email/source INSERT remains supported without client SELECT/UPDATE/DELETE.

These creation quotas are not a complete anti-abuse/rate-limit system for every
operation. Deployed-policy/storage/function review, logging, provider credentials,
dependency treatment and wider cross-account cases remain `SCRUM-47` scope.

## Source And Verification

- [Report contracts](../../../packages/shared/src/queries/reports.ts),
  [limits](../../../packages/shared/src/validation.ts),
  [native report sheet](../../../apps/mobile/src/components/content-report-sheet.tsx),
  [queue](../../../apps/web/src/app/pages/moderate.tsx),
  [review panel](../../../apps/web/src/app/pages/moderation/report-review-panel.tsx),
  [block queries](../../../packages/shared/src/queries/blocks.ts).
- Schema: [duplicate reports](../../../supabase/migrations/030_prevent_duplicate_pending_reports.sql),
  [review/actions](../../../supabase/migrations/039_moderation_review_actions.sql),
  [report details](../../../supabase/migrations/040_reporter_details.sql),
  [blocking](../../../supabase/migrations/041_user_blocking.sql),
  [quotas/waitlist](../../../supabase/migrations/042_waitlist_and_rate_limit_security.sql).
- Tests: [native report sheet](../../../apps/mobile/src/components/content-report-sheet.test.tsx),
  [web queue](../../../apps/web/src/app/pages/moderate.test.tsx),
  [blocked accounts](../../../apps/mobile/src/screens/blocked-accounts.test.tsx),
  [moderation SQL](../../../supabase/tests/moderation.sql),
  [blocking SQL](../../../supabase/tests/blocking.sql),
  [security SQL](../../../supabase/tests/security.sql),
  [quota races](../../../scripts/test-rate-limit-concurrency.mjs).

Use both app suites, `npm run test:db` and the
[moderation runbook](../../backlog/MODERATION-LAUNCH.md) for real two-account/device
checks. [Blocking evidence](../../backlog/USER-BLOCKING.md) and
[security evidence](../../backlog/SECURITY-REVIEW.md) retain their scoped status.
No new moderator/admin role, data access grant or live enforcement is authorised
by documenting these paths.
