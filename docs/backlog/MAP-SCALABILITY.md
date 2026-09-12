# MAP: Map Scalability and Canonical Locations

Status: Planned
Jira epic: `SCRUM-78`
Priority: High foundations; Medium scale work
Labels: `native`, `product`, `platform`, `post-launch`

## Outcome

Keep the prayer map useful, fast, and privacy-preserving as Oratio grows from a
small beta to global usage. The map continues to show aggregated places rather
than individual prayer pins, while location identity, counts, drill-down, and
query cost remain predictable at scale.

## Product Decisions

- A map point represents an aggregated place, never an individual prayer or a
  person's precise position.
- City and country are the finest public location granularity.
- Location remains optional. Prayers without a canonical, mappable place remain
  available in the appropriate feeds but do not appear on the map.
- Marker size represents recent public prayer-request activity. Engagement is a
  separate visual or textual signal rather than being mixed into marker size.
- Location detail shows recent prayers first and retains all-time totals for
  context.
- World and regional views may aggregate cities into larger geographic groups;
  city hotspots appear as the user zooms in.

## Success Metrics

- Map queries and payload sizes are bounded by the visible viewport and zoom
  level, not by the total number of prayers or known places.
- A benchmark containing at least 1 million public prayers and 5 million prayer
  interactions meets an agreed p95 hotspot-query target before launch of the
  scaled implementation.
- The client never renders one marker per prayer and has a documented maximum
  number of visible hotspot or cluster markers.
- Location prayer lists can reach every matching public prayer through cursor
  pagination.
- No exact device coordinate or user-entered street-level coordinate is stored
  or exposed for map display.
- Alias spelling and capitalization cannot split one real place into multiple
  hotspots.

## Delivery Order

Stories 1-3 are beta-safe foundations and can be delivered independently.
Stories 4-6 are growth work and should be implemented before map volume makes
global aggregation or all-city rendering operationally expensive.

## Story 1: Replace free-text map identity with canonical places

Jira: `SCRUM-84`
Priority: High
Fix Version: V1 Launch

### User Story

As a person sharing a prayer, I want to select a recognized city and country,
so that my optional location is displayed consistently and privately.

### Acceptance Criteria

- GIVEN a person adds a location WHEN they search and choose a result THEN the
  prayer stores a stable place identifier, canonical city, country code, display
  country, and fixed coarse centroid.
- GIVEN two aliases for the same place WHEN prayers are created THEN both prayers
  resolve to the same place identifier and hotspot.
- GIVEN no location is selected WHEN a prayer is submitted THEN submission
  succeeds and the prayer is excluded from the map without using fabricated
  coordinates.
- GIVEN an existing prayer with legacy city and country fields WHEN it is read
  THEN it remains visible and can be reconciled to a canonical place without
  breaking existing links.
- GIVEN a canonical place WHEN its map coordinate is stored THEN that coordinate
  is a fixed place centroid and not the person's precise position.

### Tests

- Shared normalization and location mapping unit tests
- Native submission tests for selected, omitted, and unsupported locations
- Migration tests for aliases, legacy rows, and duplicate-place prevention
- `npm run type-check:mobile && npm run test:mobile`

### Out of Scope

- Street addresses, neighbourhoods, live location sharing, and background
  location tracking
- Choosing a permanent geospatial clustering technology

## Story 2: Introduce a dedicated hotspot contract and resilient loading

Jira: `SCRUM-85`
Priority: High
Fix Version: V1 Launch

### User Story

As a map user, I want hotspots and their counts to remain accurate when services
degrade, so that the map never misrepresents individual prayers as aggregates.

### Acceptance Criteria

- GIVEN hotspot data is mapped in shared code WHEN it reaches the native app THEN
  it uses a dedicated `MapHotspot` type rather than a synthetic `PrayerRequest`.
- GIVEN a hotspot is returned WHEN it is displayed THEN request count, recent
  request count, distinct people-prayed count, place identity, centroid, and
  latest activity have explicit fields and meanings.
- GIVEN the aggregate endpoint fails WHEN the map loads THEN the app shows a
  retryable error or a valid cached aggregate; it never falls back to raw prayer
  rows as markers.
- GIVEN marker prominence is calculated WHEN counts vary widely THEN size is
  based on recent request activity using a tested logarithmic scale and does not
  mix request and engagement counts.

### Tests

- Shared hotspot mapper and scale unit tests
- Native map loading, empty, error, retry, and selection tests
- Regression test proving duplicate raw markers cannot be used as a fallback

### Out of Scope

- Viewport clustering and database aggregate maintenance

## Story 3: Paginate prayers within a location

Jira: `SCRUM-86`
Priority: High
Fix Version: V1 Launch

### User Story

As a person viewing a busy city, I want to continue loading its prayers, so that
the location view does not silently stop after the first page.

### Acceptance Criteria

- GIVEN a canonical place has more than one page of public prayers WHEN a person
  reaches the end of the list THEN the next page loads using a stable cursor.
- GIVEN new prayers are added during browsing WHEN pages load THEN prayers are
  not duplicated and the cursor order remains deterministic.
- GIVEN the location view opens WHEN aggregate data is available THEN it displays
  the location's total separately from the number of rows currently loaded.
- GIVEN a refresh WHEN it completes THEN the first page and pagination state are
  replaced consistently.

### Tests

- Shared location-query cursor tests
- Native list pagination, refresh, empty, and failure tests
- Database index plan checked against the canonical place lookup

### Out of Scope

- Feed ranking or recommendations within a location

## Story 4: Serve recency-aware precomputed location statistics

Jira: `SCRUM-87`
Priority: Medium
Fix Version: Post-Launch

### User Story

As a map user, I want hotspot intensity to reflect current prayer needs, so that
historically busy cities do not dominate the map forever.

### Acceptance Criteria

- GIVEN prayer and interaction history grows WHEN hotspot statistics are queried
  THEN request latency is not proportional to scanning the full history on every
  map load.
- GIVEN a public prayer or interaction is created or removed WHEN aggregate data
  refreshes THEN the affected place totals become consistent within a documented
  freshness window.
- GIVEN a hotspot is returned WHEN it is displayed THEN it provides recent
  request activity for prominence and all-time totals for detail context.
- GIVEN the recency window is changed WHEN product requirements evolve THEN it is
  configured centrally rather than duplicated in clients.
- GIVEN private or Circle prayers exist WHEN statistics are calculated THEN they
  never contribute to public hotspot totals.

### Tests

- Aggregate consistency tests for create, delete, and interaction changes
- Audience privacy tests
- Query-plan and latency benchmark using representative generated data

### Out of Scope

- Personalised map ranking

## Story 5: Query and cluster hotspots by viewport and zoom

Jira: `SCRUM-88`
Priority: Medium
Fix Version: Post-Launch

### User Story

As a map user, I want the map to reveal meaningful activity as I zoom and pan,
so that dense areas remain understandable and responsive.

### Acceptance Criteria

- GIVEN the map is at world zoom WHEN hotspots load THEN the response contains
  bounded country or regional clusters rather than every city worldwide.
- GIVEN the user zooms into a region WHEN the configured threshold is crossed
  THEN clusters progressively resolve into city hotspots.
- GIVEN the visible region changes WHEN a query is sent THEN only relevant
  bounds and zoom are requested, stale responses cannot replace newer results,
  and requests are debounced.
- GIVEN the viewport crosses the international date line WHEN hotspots load THEN
  places on both visible sides are handled correctly.
- GIVEN a response contains more than the client marker budget WHEN it is served
  THEN the server returns a coarser aggregation rather than an unbounded payload.
- GIVEN a previously viewed region is revisited WHEN cached data is still valid
  THEN it can render immediately while freshness is checked.

### Tests

- Bounds, zoom-threshold, date-line, stale-response, and cache tests
- Native interaction tests for pan, zoom, selection, and cluster expansion
- Performance checks on the oldest supported iPhone class

### Out of Scope

- Turn-by-turn navigation or user tracking
- Mandating PostGIS, geohash, or H3 before benchmark evidence selects one

## Story 6: Verify map scale, privacy, and observability

Jira: `SCRUM-89`
Priority: Medium
Fix Version: Post-Launch

### User Story

As the product owner, I want measurable map performance and privacy guarantees,
so that growth problems are detected before users experience them.

### Acceptance Criteria

- GIVEN generated scale fixtures WHEN map queries are benchmarked THEN results
  record prayer count, interaction count, place count, response size, execution
  plan, and p50/p95 latency.
- GIVEN map and location requests run in production WHEN failures or latency
  regressions occur THEN structured telemetry identifies the endpoint and broad
  failure class without recording prayer text or precise location data.
- GIVEN a sparsely represented place WHEN privacy review is performed THEN the
  team explicitly decides whether minimum-count suppression or broader regional
  grouping is required before launch.
- GIVEN the marker budget is exceeded WHEN observed in telemetry THEN an alert or
  dashboard signal makes the condition visible.
- GIVEN the feature is release-ready WHEN manual QA runs THEN public-only
  visibility, optional location, marker semantics, pagination, and zoom behavior
  are covered in `docs/QA-CHECKLIST.md`.

### Tests

- Repeatable database benchmark script and recorded baseline
- Telemetry redaction tests
- Manual QA on representative sparse and dense map fixtures

### Out of Scope

- Collecting prayer content, exact coordinates, or personal identifiers in map
  performance telemetry
