# LLD: Prayers And Discovery

Last reviewed: 2026-10-21. FR-02/03/04/07/11; NFR-01/02/03/04.
Parent: [HLD](../../ARCHITECTURE.md). [Story mapping](../TRACEABILITY.md).
Expiry implementation is checkpointed in `817b4b8`; this does not imply distribution.

## Records And Mapping

`prayer_requests` owns ID, `user_id`, body/category, audience, anonymity,
place ID/country code/city/country/coarse coordinates, counters, comment setting, creation/edit times
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
device's precise GPS position. The native picker searches the backend city
catalog, selecting a stable GeoNames place ID with region/country disambiguation.
Auto-detection resolves the OS city and ISO country code against that same catalog;
ambiguous/unsupported results allow manual search or no location. Unfinished search
text must be selected or cleared before submission. No typed street/GPS is saved.

`createPrayerRequest` obtains the authenticated user, inserts only intended input
fields, then returns the inserted ID or null. The server assigns public expiry
and derives location from the catalog, ignoring all caller-supplied coordinates.
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

| Operation                        | Current Bound / Order                                    | Important Behavior                                                                                                     |
| -------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `getFeedPrayers`                 | Default 20; creation descending; timestamp-only cursor   | Public expiry/audience/country/saved/search filters run before limit. Circle uses a separate audience filter.          |
| `getMyPrayers`                   | 50-row offset pages; creation then ID descending         | Owner history retains archives; explicit throw-on-error option for paging; UI deduplicates/retries earlier-page loads. |
| `getUserPrayers`                 | Up to 50, creation descending                            | Excludes anonymous attribution and expired public rows; RLS decides eligible non-public rows.                          |
| `getPublicPrayersAtLocationPage` | Default 50, capped at 100; creation then UUID descending | Native cursor paging with one lookahead row, active public/place filters and a separate first-page count.              |
| `getPublicPrayersAtLocation`     | Default 50, capped at 100; creation descending           | Single-page compatibility helper; normalised names retained for existing callers.                                      |
| `getMapHotspots`                 | Aggregate RPC; one row per eligible canonical place      | Dedicated `MapHotspot` values; no individual-prayer fallback. Native uses explicit throw-on-error for retry UI.        |

Search normalises/bounds the term to 80 characters and applies text/location/
category matching on the server. Trending tags come from loaded feed content,
not an exhaustive global ranking system. Saved/prayed ID and history helpers
are not all paginated. Timestamp-only feed cursor ties and those helper bounds
remain part of resilience/capacity review; do not claim deterministic composite
pagination for every list.

### Location Cursor Pages

`getPublicPrayersAtLocationPage` returns `{ prayers, nextCursor, totalCount }`.
`nextCursor` contains the last included row's original `createdAt` and UUID `id`,
or null when the lookahead proves the end. Queries order both columns descending
and select rows where creation is earlier, or equal with a smaller UUID. Preserve
the raw PostgreSQL timestamp string, including microseconds; converting through a
JavaScript Date would truncate precision. Cursor fields are validated before
constructing the PostgREST disjunction. Place ID, audience, expiry and normal RLS
apply to every page; row offsets are not used.

The first page requests an exact count before the page limit. Later pages return
null for `totalCount` rather than recounting a cursor-filtered subset. Native UI
labels the total **at last refresh**, separately from currently loaded, unexpired
rows. This is a caller-visible active-request snapshot, not an all-time statistic
or a transactional snapshot across pages. Newer insertions appear after refresh;
deletions, expiry and access changes can alter subsequent page membership.

Native next-page loads deduplicate IDs and guard repeated end-of-list events.
Failure preserves rows and cursor, with explicit retry rather than automatic
retry loops. A successful refresh replaces rows, cursor and total together; a
failed refresh retains rows with a retry warning and suspends paging. Request
generations discard results superseded by refresh, route changes or blur.

The disposable database suite checks the authenticated, profile-joined cursor
query uses the 044 `prayer_requests_place_created_idx` index without planner
overrides. This check does not prove a production-scale latency target. No new
schema migration is needed for this paging contract.

## Map Contract And Location Privacy

The 044 `get_map_hotspot_totals()` RPC is security-invoker. It aggregates active
public requests by catalog place ID and returns canonical city/country/country
code, a fixed catalog centroid, request count, distinct people-prayed count,
latest original creation time and `next_expires_at`. Caller RLS still applies.
Unknown/unmapped/absent places do not produce public hotspots.

`prayer_places` and `prayer_place_aliases` are authenticated read-only tables;
search is indexed and capped at 12. The server trigger canonicalises explicit
place IDs or unique city/country aliases. Unverified legacy names remain readable
but lose coordinates; Private loses all location fields. The 045 seed/backfill
preserves prayer identity/content/audience/expiry. Catalog provenance, rollout
state and device acceptance are in the [place record](../../backlog/CANONICAL-PLACES.md).

### Hotspot Client Contract

Shared queries return `MapHotspot`, not `PrayerRequest`. The strict mapper accepts
only a canonical place ID, country code, valid centroid, integer counts and valid
creation/expiry timestamps. Malformed or duplicate place rows fail the request;
they are not silently dropped into a partial aggregate. Transport/RPC failures
never query individual prayers as a fallback. The existing web query shim alone
adapts validated aggregates into its renderer's historical marker shape.

| Field                                                     | Meaning                                                                                                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `placeId`, `city`, `country`, `countryCode`, `lat`, `lng` | Canonical catalog identity/display names and fixed coarse centroid                                                                              |
| `requestCount`                                            | Active public requests visible to the caller; not an all-time total                                                                             |
| `recentRequestCount`                                      | Same active count under the existing 14-day server-managed visibility lifecycle, including renewed requests; no independent creation-age filter |
| `peoplePrayedCount`                                       | Distinct eligible people who prayed across those active requests, from the RPC's legacy `prayer_count` column; not the sum of interactions      |
| `latestRequestCreatedAt`                                  | Latest original creation time among contributing requests; not a renewal or interaction timestamp                                               |
| `nextExpiresAt`                                           | First contributing request's visibility deadline; the aggregate must be invalidated/reloaded at that point                                      |

Marker diameter is `min(30, 16 + 2 * log2(1 + recentRequestCount))`. Engagement
does not influence size. Native marker snapshots are recreated when that size
changes. Distinct historical totals or independently configurable recency windows
are not provided by this foundation; they remain `SCRUM-87` scope.

The native map clears prior markers/counts and selection on a failed refresh,
shows a retryable error rather than an empty-success state, and ignores in-flight
responses after blur or a newer request. There is no persisted aggregate cache.
`react-native-maps` retains the existing zoom limits and one-tap recentering without
writing the device position to a prayer row.

`usePrayerClock` updates loaded content at deadlines and on foreground; map uses
the next aggregate expiry to refresh counts and hides stale expired selections
until refreshed. Public/profile/location clients also filter cached expired rows.
This handles freshness, not authoritative time: database checks use server time.
Device clock skew and changed access still belong in candidate QA.

### Open Map Targets

- `SCRUM-84`: canonical-place implementation tested and 044/045 deployed; local
  client/device acceptance tracked in the place record, not a completed release gate.
- `SCRUM-85`: dedicated aggregate-only contract, request-based scale and native
  error/retry/stale-response handling implemented and tested locally. A reported
  iPhone hotspot/offline-retry smoke check passed on 2026-10-21; wider acceptance
  and candidate CI remain open. Review revisions are tracked in draft PR #5.
- `SCRUM-86`: composite location pagination and separate total/loaded counts
  implemented and tested locally; physical-device paging acceptance remains open.
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

Native feed/detail queries opt into explicit read errors; compatibility callers
retain the existing fallbacks. Feed, map/location and detail loading use logical
deadlines and request-generation guards. Feed next-page failures retain the cursor
and show explicit retry; failed refresh retains loaded rows with a warning.

Native prayer submission supplies a fixed per-attempt UUID and expected account.
An uncertain result locks the draft/settings until owner-scoped verification and
same-ID retry confirms the outcome. The existing primary key prevents duplicate
inserts; conflicts never trigger an overwrite. First-attempt definite rejections
permit editing; failed verification of a prior uncertain attempt never allocates
a new ID. This is an open-composer contract, not persistent offline storage.
See the [resilience record](../../backlog/NATIVE-RESILIENCE.md) for source/tests,
failure semantics and device acceptance.

Query failures still use null/false/empty fallbacks in other helpers. A missing
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
- Places: [shared lookup](../../../packages/shared/src/queries/places.ts),
  [native picker](../../../apps/mobile/src/components/prayer-location-picker.tsx),
  [catalog schema/RPC](../../../supabase/migrations/044_prayer_place_catalog.sql),
  [database assertions](../../../supabase/tests/prayer-places.sql).
- Hotspots: [contract/mapper/scale](../../../packages/shared/src/map-hotspots.ts),
  [contract/query regressions](../../../apps/web/src/app/services/map-hotspots.test.ts),
  [web compatibility shim](../../../apps/web/src/app/services/supabase-queries.ts).
- Location paging: [cursor query tests](../../../apps/web/src/app/services/location-pagination.test.ts),
  [RLS/paging/index-plan assertions](../../../supabase/tests/location-pagination.sql).
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
