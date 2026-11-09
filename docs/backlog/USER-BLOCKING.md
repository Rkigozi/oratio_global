# Native User Blocking

Jira: [SCRUM-94](https://oratio.atlassian.net/browse/SCRUM-94).
Parent: SCRUM-62. Priority: Highest. Fix version: V1 Launch.
Status: In Progress (2026-09-28). Related reporting story: SCRUM-71.

## Scope

- Confirmed Block action in another user's profile options and eligible named prayer/comment actions.
- Mutual backend denial of content access and further interactions, including
  direct links, username aliases, comments/replies, saved prayers, map results and Updates.
- Blocking removes the Circle connection and cancels pending invitations atomically.
- Settings lists only accounts the caller blocked, with pagination, retry and Unblock.
- Unblocking removes only the caller's block; reciprocal blocks remain effective.
  It never restores invitations or Circle connections automatically.
- Cancelled/failed actions do not claim success. Success clears the native navigation
  stack so previously loaded content is not left on the current journey.
- Existing reports and report-scoped moderator review remain available. Anonymous
  prayer authors are not revealed; the named-author Block action is not shown on
  anonymous prayers. This does not claim an anonymous-author blocking journey.

This is personal account blocking, not a service-wide administrator ban or content
filter. Android UI and a second full web product are out of scope.

## Implementation And Verification

The implementation includes migration `041_user_blocking.sql`, shared query APIs
and native UI. The final disposable PostgreSQL run on 2026-09-28 passed 58 blocking
assertions, all 45 existing moderation assertions, and seven two-session race tests.
The race tests cover both orderings of Block versus Circle accept, invite and legacy
follow, plus reciprocal blocks. They wait for observed database locks, not timing
assumptions. Review caught and fixed an in-flight legacy-follow bypass and the legacy
Circle cancellation RPC's missing signed-in check; anonymous/expired/wrong-account
calls are denied and the requester can still cancel their own pending invitation.
Follow-up on 2026-09-28:
206 mobile tests and 485 web regression tests pass, alongside both type-checks
and web lint/build. Native coverage includes confirmation/cancellation/failure,
duplicate-tap protection, stack reset, anonymous attribution, Settings navigation,
unblock, list errors and pagination. Shared RPC tests cover auth, self-block
rejection, bounded pages and backend failures. No public web UI was added.
Physical iPhone verification remains open; this is not release sign-off.

`node scripts/test-moderation-db.mjs` creates and destroys a local PostgreSQL cluster;
it never connects to the live Supabase project.

## Rollout Gates

- [x] Shared query and native action/list/error/navigation regressions pass (2026-09-28).
- [x] Review database concurrency, API bypasses and existing moderation regressions (2026-09-28).
- [x] Both type-checks and relevant regression suites pass on the final diff (2026-09-28).
- [x] Apply migration 041 to Oratio_DB with recorded deployment approval after verification (2026-09-28).
- [ ] Physical iPhone/two-account tests cover Block, failed/cancelled actions,
      content refresh, connection removal, denied invites, reciprocal blocks and Unblock.
- [ ] Record the live-migration and tested native build evidence before closing the story.

## Live Rollout - 2026-09-28

Implementation commit `6b5a710` is pushed to main and its GitHub CI passed. With
recorded maintainer approval, the linked project was verified as Oratio_DB
(`tfwgoavbbudkxthjhnrx`); a dry run listed only `041_user_blocking.sql`, which was
then applied using the Supabase migration CLI. Local/remote history matches 001-041.

Read-only live verification confirmed RLS on `user_blocks`, all 10 blocking policies,
all three relationship-write guards, fixed security-definer settings, authenticated
RPC grants, denied anonymous RPC access and no direct client block-table writes.
Read-only, rolled-back calls verified rejection of anonymous/missing-identity
requests and an empty blocked-account list without an authenticated identity.

Before/after aggregates remained unchanged: 24 prayers, 10 comments, 10 invitations,
4 Circle connections, 0 legacy follows and 22 reports. The moderator count (1) and
role fingerprint were unchanged, and `user_blocks` contained 0 rows. No real account
was blocked or given a role. This does not distribute a native build or complete the
physical iPhone/two-account acceptance tests. SCRUM-94 remains In Progress.

## Physical QA - 2026-09-28

The maintainer reported the first Expo/iPhone test passed: block another QA account from
their profile, confirm the action, receive success feedback, return to Public prayers
and find the account in Settings > Blocked accounts. The maintainer also reported
that switching to the blocked account and refreshing Public prayers hides the
blocking account's prayers. The Settings Unblock journey also passed: confirming
Unblock removes the list entry and refreshing both accounts restores public prayer
visibility without automatically restoring a Circle connection. These confirmations
cover those specific checks only.
The zero-block count above is the pre-QA rollout snapshot, not a claim about the
database after these manual test sessions.

## Physical QA - 2026-09-29

The maintainer explicitly reported both Cancel and Block from a named public prayer's
three-dot menu. Cancel leaves the prayer accessible; confirming Block succeeds,
returns to Public prayers and hides that author's prayers from the blocking account.
The maintainer also reported Cancel and Block from the other QA user's comment. All three
entry points (profile, named prayer and comment) are now confirmed, alongside the
basic Unblock and public-feed visibility journeys. Do not repeat those passed tests
unless the implementation changes or a regression is reported.

## Remaining Device Pass

Group these checks into one pass; unconfirmed items stay open in the QA checklist:

1. Privacy and Circle: other surfaces/direct links, unrelated-account access,
   existing connection/pending-invite removal, and denied interactions/invites.
2. Recovery and ownership: failed Block/Unblock with clear feedback and deliberate
   retry, caller-owned block lists, and one-sided Unblock with a reciprocal block.
   A reciprocal-block device check needs a suitable QA fixture; do not create
   live block relationships outside the approved QA fixture scope. Backend coverage already passes.
3. Presentation: the new controls and feedback are readable and reachable in both
   light and dark mode on iPhone.

SCRUM-94 remains In Progress until this remaining acceptance evidence is recorded.

## Profile Options Polish - 2026-10-07

Moved the prominent red profile-header Block icon into a bottom options sheet,
opened by a neutral three-dot button. The centered heading and Circle actions
are unchanged. Block still requires the existing confirmation; on iOS the sheet
finishes dismissing before that confirmation opens. Closing the sheet has no
side effects. Own, unavailable and signed-out profiles do not expose the action.

64 focused native tests pass across profile, Circle actions, prayer detail and
blocked accounts, alongside the mobile type-check and diff whitespace check.
Coverage includes hidden-until-open Block, close/backdrop/back cancellation,
single confirmation after dismissal, sign-out during dismissal, failed-block
retry and navigation reset. No backend changes, live blocks, commit or push.

The maintainer reported the updated profile menu worked (2026-10-07). This records the
basic relocated entry point as maintainer-reported, not a separate confirmation of both
themes or every cancellation/recovery case. Keep the remaining presentation
checks in the consolidated device pass rather than repeating this basic flow.
Existing passed backend/Unblock device evidence remains valid; this change is
not a reason to repeat the entire blocking acceptance pass.
