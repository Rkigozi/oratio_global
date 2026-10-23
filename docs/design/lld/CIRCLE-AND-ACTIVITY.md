# LLD: Circle And Activity

Last reviewed: 2026-10-20. FR-05; NFR-01/02. Parent: [HLD](../../ARCHITECTURE.md).
Existing implementation owner: `SCRUM-69`; blocking/resilience: `SCRUM-94/95`.

## Relationship Records And Invariants

`prayer_circle_invites` holds requester, recipient, optional message, status and
response time. `prayer_circle_connections` represents the accepted pair, not
unilateral following. Each user has one accepted-peer Circle with capacity 12;
this is not 12 named groups. Migration 032 adds capacity/publication rules and
041 serialises relationship writes with blocks.

UI relationship states are `none`, `pending_sent`, `pending_received`, `connected`
and `self`. Unknown/error must not be presented as a successful invitation or a
confirmed empty relationship when the caller requested strict error behavior.

| Event       | Allowed Actor / Transition               | Server Consequence                                                                    |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| Send invite | Signed-in requester, other eligible user | Pending invite; self/blocked/invalid/over-capacity pairs rejected                     |
| Accept      | Invited recipient, still-pending invite  | Lock both profiles and invite, recheck block/capacity, create accepted connection     |
| Decline     | Recipient, pending invite                | Terminal declined invite; no connection                                               |
| Cancel      | Requester, pending invite                | Terminal cancelled invite; wrong actor/missing identity rejected                      |
| Remove      | A participant in the connection          | Delete accepted pair; no implied acceptance on a future invite                        |
| Block       | Either account                           | Cancel pending invites and remove accepted relationship in the same guarded operation |
| Unblock     | Original blocker                         | Remove that block only; no connection or invite restoration                           |

Acceptance and blocking use consistent profile-lock ordering before the invite
row is rechecked/locked. This prevents an accept racing a block from recreating
the connection, and concurrent accepts from exceeding capacity. Existing
transaction tests cover commit and rollback behavior; actual release-path retries
still need NFR-02 evidence.

Circle prayer access checks current accepted membership, not membership at
posting time or possession of a share URL. Publishing requires at least one
accepted peer. A removed peer loses server-authorised reads; already-rendered
content is removed on subsequent refresh, not remotely erased from a device.
Circle prayers have no public expiry or public-map contribution.

## Shared Operations And UI

`sendPrayerCircleInvite` inserts a requester-owned pending row.
`respondToPrayerCircleInvite` and `cancelPrayerCircleInvite` use scoped RPCs;
`removeFromPrayerCircle` deletes the participant pair under RLS. Read helpers
produce members, count, incoming/outgoing pending invites and relationship status.
Profile invitation controls and Circle Management share these contracts.

Errors return failure/throw according to the helper contract and keep a
retryable UI; they cannot silently grant membership. Current membership/invite
reads are not a general paginated large-social-graph API. The small accepted
Circle cap does not by itself bound all historic or pending invite records.

## Activity Records And Freshness

Database triggers create `activity_events` for supported Circle, prayer/comment
and report-review activity. Events include recipient, actor, type, linked target,
read state and timestamps. They are in-app Updates, not native push delivery.
Preferences control eligible event generation; actor/content visibility still
uses the current access boundary.

`getActivityEvents` defaults to the newest 50; unread count and mark-read/delete
operations are recipient-scoped. Native `ActivityUpdatesProvider` subscribes to
recipient changes, refreshes on foreground and polls every 30 seconds only while
active. It clears timers/subscriptions on cleanup and resets unread state without
a user. The provider drives the Public bell badge and Updates refresh version.

```text
authorised action -> transactional trigger event
  -> recipient RLS -> subscription/refetch or active poll
  -> unread badge / Updates list -> open target
  -> target fetched again under current audience/block/moderation/expiry rules
```

An old event cannot grant access to a removed, hidden, blocked, private or expired
target. Error/empty/unavailable destinations must be understandable. Realtime is
optional transport: absence of a socket must not be interpreted as absence of
events or an accepted Circle connection.

## Source And Verification

- [Circle queries](../../../packages/shared/src/queries/circle.ts),
  [Updates queries](../../../packages/shared/src/queries/updates.ts),
  [native provider](../../../apps/mobile/src/hooks/activity-updates-context.tsx),
  [management](../../../apps/mobile/src/screens/prayer-circle-management.tsx),
  [profile controls](../../../apps/mobile/src/components/profile-circle-actions.tsx).
- Schema: [016](../../../supabase/migrations/016_prayer_circle.sql),
  [032](../../../supabase/migrations/032_private_prayers_and_circle_limits.sql),
  [event preferences](../../../supabase/migrations/034_comment_update_preferences.sql),
  [041](../../../supabase/migrations/041_user_blocking.sql),
  [expiry access](../../../supabase/migrations/043_public_prayer_expiry.sql).
- Tests: [management](../../../apps/mobile/src/screens/prayer-circle-management.test.tsx),
  [profile invitations](../../../apps/mobile/src/components/profile-circle-actions.test.tsx),
  [provider](../../../apps/mobile/src/hooks/activity-updates-context.test.tsx),
  [inbox](../../../apps/mobile/src/screens/updates.test.tsx),
  [blocking SQL](../../../supabase/tests/blocking.sql),
  [concurrency](../../../scripts/test-blocking-concurrency.mjs).

Run mobile/web suites and `npm run test:db`. Device checks include author, accepted
peer and outsider, invite cancellation/limit/repeated taps, block/accept races,
background/foreground, unread/read state and inaccessible linked targets. Reuse
dated results in [functional QA](../../QA-CHECKLIST.md); do not close a whole NFR
from a single successful invite.
