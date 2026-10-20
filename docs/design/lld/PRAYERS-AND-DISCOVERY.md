# LLD: Prayers And Discovery

Last reviewed: 2026-10-20. FR-02/03/04/07/11; NFR-01/02/03/04.
Parent: [HLD](../../ARCHITECTURE.md). [Story mapping](../TRACEABILITY.md).
Expiry implementation is checkpointed in `817b4b8`; this does not imply distribution.

## Records And Mapping

`prayer_requests` owns ID, `user_id`, body/category, audience, anonymity,
city/country/coarse coordinates, counters, comment setting, creation/edit times
and `public_expires_at`. The mapper exposes `text`, `authorId`, `createdAt`,
`editedAt` and optional `expiresAt` to clients. Shared queries use explicit select
columns, with a joined profile where needed. Anonymous mapping suppresses displayed
username/avatar; the row remains associated with its author.

`prayer_interactions` has a unique user/prayer pair and is the source of truth
for prayer count (037). `saved_prayers` records an owner's save. `comments`
stores body, author, prayer and optional parent; replies are one level in the UI.
Related reads/writes must still satisfy current prayer access, not merely know an ID.

## Submission And Audience

Native Submit validates the shared 10-500-character text contract and presents
Public/Circle/Private. Location is optional. Detection is explicit, requires
foreground permission and resolves a coarse place rather than persisting the
device's precise GPS position. Manual location and canonicalisation currently
use shared normalisation/coarse lookup, not stable place IDs.

`createPrayerRequest` obtains the authenticated user, inserts only intended input
fields, then returns the inserted ID or null. The server assigns public expiry.
Private explicitly stores blank city/country and null coordinates regardless of
stale form state. Circle is attributed and requires at least one accepted peer.
RLS enforces own identity, supported audience and the fixed creation quota.

Successful submission routes back into the selected prayer journey. An insert
failure must retain a recoverable form state and must not announce publication.
Normal owner updates change body or comments-enabled only; audience, ownership,
creation date and expiry cannot be rewritten with an ordinary client UPDATE.
Owner deletion is explicit and distinct from automatic archiving.

## Public Lifecycle

```text
public insert -> active, server deadline = statement time + 336 hours
time reaches deadline -> archived (derived, not a stored answered/deleted state)
expired owner history -> explicit renewal RPC -> active with a fresh deadline
explicit owner deletion -> row deletion under ownership rules
```

043 gives existing public rows a fresh 336-hour rollout window. Circle/private
deadlines are null. The check constraint, trigger and revoked update grants guard
the contract. Ordinary body/settings edits do not renew.

`renew_public_prayer(p_prayer_id uuid) -> timestamptz` runs as a narrowly scoped
security-definer function with a fixed search path. It rejects missing identity,
missing/non-owned/non-public/hidden targets (`42501`) and active targets (`22023`).
It locks the owned row before checking expiry, so simultaneous attempts cannot
extend an already-renewed prayer. Success changes only the deadline plus normal
automatic update metadata. Original ID/body/creation time/comments/counts remain.

Shared `renewPublicPrayer` accepts only a valid timestamp result. Native detail
has busy, retry/error and success states and applies a response only to the same
currently displayed ID. It shows Public until in local date/time/timezone or an
Archived panel with Renew for 14 days. Renewal does not bump chronological feed
creation order. No countdown, auto-renewal, reminder or hard-delete job exists.

Expired public rows are visible only to their owner under the additional SELECT
restriction, still subject to moderation. `can_view_prayer_request` includes
caller identity, audience, blocking, moderation and deadline, protecting related
comments/saves/activity/report paths. Existing report-scoped moderator review is
not blanket archive-library access. New comments/interactions/saves are denied on
expired public rows; the archive UI hides compose/edit controls while retaining
existing comment history. Private Notes and Circle prayers do not expire.

## Discovery And Retrieval Contracts

| Operation                    | Current Bound / Order                                  | Important Behavior                                                                                                     |
| ---------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `getFeedPrayers`             | Default 20; creation descending; timestamp-only cursor | Public expiry/audience/country/saved/search filters run before limit. Circle uses a separate audience filter.          |
| `getMyPrayers`               | 50-row offset pages; creation then ID descending       | Owner history retains archives; explicit throw-on-error option for paging; UI deduplicates/retries earlier-page loads. |
| `getUserPrayers`             | Up to 50, creation descending                          | Excludes anonymous attribution and expired public rows; RLS decides eligible non-public rows.                          |
| `getPublicPrayersAtLocation` | Default 50, capped at 100; creation descending         | Normalised city/country + active public filter; native currently requests only first 50.                               |
| `getMapHotspots`             | Aggregate RPC; legacy fallback at most 200 raw rows    | Authorisation is enforced by underlying RLS; fallback is a known incomplete target, not scale acceptance.              |

Search normalises/bounds the term to 80 characters and applies text/location/
category matching on the server. Trending tags come from loaded feed content,
not an exhaustive global ranking system. Saved/prayed ID and history helpers
are not all paginated. Timestamp-only feed cursor ties and those helper bounds
remain part of resilience/capacity review; do not claim deterministic composite
pagination for every list.

## Map Contract And Location Privacy

The 043 `get_map_hotspot_totals()` RPC is security-invoker. It aggregates only
active public requests with usable coarse locations and returns city/country,
average coarse latitude/longitude, request count, distinct people-prayed count,
latest original creation time and `next_expires_at`. It canonicalises known
country/London aliases. Unknown/zero/absent places do not produce public hotspots.

The legacy RPC column `prayer_count` means distinct people who prayed at that
place, not sum of request interactions. Shared `mapHotspotTotal` currently maps
an aggregate into a synthetic `PrayerRequest` with a location ID. Native map
uses `react-native-maps`, limits zoom and provides one-tap recentering without
writing the device position to a prayer row.

`usePrayerClock` updates loaded content at deadlines and on foreground; map uses
the next aggregate expiry to refresh counts and hides stale expired selections
until refreshed. Public/profile/location clients also filter cached expired rows.
This handles freshness, not authoritative time: database checks use server time.
Device clock skew and changed access still belong in candidate QA.

### Open Map Targets

- `SCRUM-84`: stable canonical place identity/centroids, beyond name normalisation.
- `SCRUM-85`: dedicated `MapHotspot` type and honest aggregate-error/cached behavior;
  remove the raw-row fallback rather than presenting it as complete totals.
- `SCRUM-86`: stable complete location pagination and separate total/loaded counts.
- `SCRUM-87`-`SCRUM-89`: post-launch precomputation/clustering/large-scale work.

The [map plan](../../backlog/MAP-SCALABILITY.md) defines these acceptance criteria;
they are not silently satisfied by the existing map foundation.

## Sharing, Comments And Failure Behavior

The native sharing service returns an HTTPS web URL only for eligible non-private,
non-archived requests. iOS share sheet, clipboard copy and dismissal have separate
outcomes. Circle URLs are still access-controlled. Shared-link expiry hides the
prayer for non-owners; renewal restores access to the same URL. See
[external handoffs](./EXTERNAL-SERVICES.md), not a promise of universal linking.

Comments load oldest-first in pages, subscribe to prayer changes and refetch.
Private Notes reuse this table under owner-only audience access. Comment settings,
moderation, blocks, parent visibility and expiry compose with base access. Do not
claim that a Realtime event itself authorises reading its target.

Query failures currently use null/false/empty fallbacks in several helpers;
selected paging/map operations can throw for an explicit retry view. A missing
result is not proof that a write succeeded. Full timeout/uncertain-response/draft
retention across all core journeys remains NFR-02 work, not a universal guarantee
from this document.

## Source And Verification

- [Prayer queries](../../../packages/shared/src/queries/prayers.ts),
  [mapping](../../../packages/shared/src/queries/shared.ts),
  [domain/location helpers](../../../packages/shared/src/prayer-data.ts),
  [validation](../../../packages/shared/src/validation.ts),
  [comments](../../../packages/shared/src/queries/comments.ts),
  [interactions](../../../packages/shared/src/queries/interactions.ts).
- Native [Submit](../../../apps/mobile/src/screens/submit.tsx),
  [Detail](../../../apps/mobile/src/screens/prayer-detail.tsx),
  [My Prayers](../../../apps/mobile/src/screens/my-prayers.tsx),
  [map/location](../../../apps/mobile/src/screens/map.tsx),
  [clock](../../../apps/mobile/src/hooks/use-prayer-clock.ts),
  [sharing](../../../apps/mobile/src/services/prayer-sharing.ts).
- Exact expiry schema/RPC: [043](../../../supabase/migrations/043_public_prayer_expiry.sql).
  Count integrity: [037](../../../supabase/migrations/037_prayer_interaction_count_integrity.sql).
- Tests: [shared queries](../../../apps/web/src/app/services/supabase-queries.test.ts),
  [domain mapping](../../../apps/web/src/app/services/prayer-data.test.ts),
  [native detail](../../../apps/mobile/src/screens/prayer-detail.test.tsx),
  [native map](../../../apps/mobile/src/screens/map.test.tsx),
  [native comments](../../../apps/mobile/src/components/prayer-comments.test.tsx),
  [native history](../../../apps/mobile/src/screens/my-prayers.test.tsx),
  [DB expiry](../../../supabase/tests/prayer-expiry.sql),
  [renewal races](../../../scripts/test-prayer-renewal-concurrency.mjs),
  [browser expiry](../../../apps/web/e2e/prayer-expiry.spec.ts).

Use both app suites/type checks, `npm run test:db` and focused browser journeys.
Live rollout and outstanding two-account/device checks remain in the
[expiry runbook](../../backlog/PUBLIC-PRAYER-EXPIRY.md). No real prayer should be
expired for testing without a separately agreed, specifically identified target.
