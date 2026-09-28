# Native User Blocking

Jira: [SCRUM-94](https://oratio.atlassian.net/browse/SCRUM-94).
Parent: SCRUM-62. Priority: Highest. Fix version: V1 Launch.
Status: In Progress (2026-09-28). Related reporting story: SCRUM-71.

## Scope

- Confirmed Block action on another user's profile and eligible named prayer/comment actions.
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
Physical iPhone and live rollout verification remain open; this is not release sign-off.

`node scripts/test-moderation-db.mjs` creates and destroys a local PostgreSQL cluster;
it never connects to the live Supabase project.

## Rollout Gates

- [x] Shared query and native action/list/error/navigation regressions pass (2026-09-28).
- [x] Review database concurrency, API bypasses and existing moderation regressions (2026-09-28).
- [x] Both type-checks and relevant regression suites pass on the final diff (2026-09-28).
- [ ] Apply migration 041 to Oratio_DB with owner approval after verification.
- [ ] Physical iPhone/two-account tests cover Block, failed/cancelled actions,
      content refresh, connection removal, denied invites, reciprocal blocks and Unblock.
- [ ] Record the live-migration and tested native build evidence before closing the story.

Migration 041 still requires separate owner approval; no live migration, account-role
change or real account block has been performed for this feature. Committing/pushing
the implementation does not apply a Supabase migration or distribute a native build,
and does not close the story. The last verified published web baseline before this
change was `4f6647d` (2026-09-26).
