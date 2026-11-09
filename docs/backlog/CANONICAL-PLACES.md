# Canonical Prayer Locations

Story: [SCRUM-84](https://oratio.atlassian.net/browse/SCRUM-84), under
[map scalability](./MAP-SCALABILITY.md). Last checked: 2026-10-23.

Status: native/shared implementation tested locally; approved database
rollout verified on Oratio_DB. Implementation is tracked in
[draft PR #5](https://github.com/Rkigozi/oratio_global/pull/5); physical-iPhone
acceptance and candidate CI remain open.
There is no website deployment or signed-iOS distribution in this change.

## Behaviour

- Public and Circle submissions may search for and select a city. Results show
  region and country to distinguish places with similar names. An unfinished
  search must be selected or cleared before submission; location itself is optional.
- Auto-detect uses foreground permission only when tapped. Device coordinates
  go to the OS reverse-geocoder, not Supabase. Only the returned city/country is
  looked up in the catalog. Unsupported or ambiguous results leave manual search
  and submission without a location available.
- The database derives canonical names, ISO country code and a fixed centroid
  from the selected `geonames:<id>`. Caller-supplied coordinates cannot override it.
- Private prayers have no place ID, names, country code or coordinates. Switching
  to Private clears the form's selection and invalidates pending detection.
- Known legacy names resolve only when their city/country alias is unambiguous.
  Unmapped legacy display names remain readable, but their coordinates are cleared
  and they do not produce map markers. No country is inferred from city alone.
- Hotspots group by place ID and native drill-down queries that ID. RLS, moderation,
  blocking and public expiry still restrict the contributing prayers.

## Catalog And Maintenance

The backend contains **31,677 places in 244 country/territory codes** from
[GeoNames](https://www.geonames.org/export/), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The picker links to the
source and license. This is the cities15000 dataset: cities/larger towns and
capitals, not every village or street. No new geocoding account is required and
typed searches are not sent to a third-party autocomplete service.

Source files: `cities15000.zip`, `countryInfo.txt`, `admin1CodesASCII.txt`, retrieved
2026-10-21 from the [official dump](https://download.geonames.org/export/dump/).
Migration 045 records source SHA-256 values. The generator excludes neighborhood,
historical and unsupported feature types, coalesces legacy London borough aliases,
preserves New York's existing display name and rounds source centroids to two
decimal places. These are approximate place positions, not measured user locations.

The ~10.8 MB generated SQL is backend seed data, **not a mobile-bundle asset**.
The catalog has read-only authenticated access, indexed prefix search capped at
12 results, and no client mutation grants. Native queries debounce for 300 ms
and ignore superseded responses.

For an initial, unapplied seed only, place the three source files in a local
directory and run from the repository root:

```bash
node scripts/build-place-catalog.mjs --source /path/to/geonames --date YYYY-MM-DD
```

The offline generator uses Node and the installed `fflate` package. It performs
no downloads or database writes. **Never regenerate migration 045 after rollout**;
future catalog corrections need a new numbered migration and impact review.
Keep existing provider IDs stable. Review any changed centroid and alias matching
before reconciling stored prayers again.

## Verification

Local checks on 2026-10-21:

- 330 mobile tests and 566 web/shared tests passed, including picker debounce,
  disambiguation, stale-response/retry, ISO detection, unsupported cities,
  omitted locations, Private clearing and canonical map drill-down.
- Both app type checks, web lint/build, and the CI-style iOS JS export passed.
  A bundle export is not a signed binary or device acceptance.
- Disposable PostgreSQL checks passed: 214 assertions across security (37),
  moderation (45), blocking (58), expiry (43) and places (31), plus 11 concurrency
  cases. The before/after rollout fixture preserves identity, body, audience,
  creation/expiry/edit times and counters while reconciling location only.

### Live Rollout

The approved rollout applied only 044 and 045 using `supabase db push --linked --yes`
on 2026-10-21, after a dry run confirmed the scope. Linked project:
Oratio_DB (`tfwgoavbbudkxthjhnrx`). Both entries are recorded in migration history.

Read-only postchecks found:

- 31,677 places, 244 country/territory codes and 327,427 aliases.
- All 24 prayers retained, including three Private prayers. The pre/post aggregate
  fingerprint of IDs, owner, body, audience, creation/expiry/edit times and counters
  matched (`ccf86dad69653f8b034f80c9d52dfb54`). This is evidence of preservation,
  not an exported copy of prayer content. Normal automatic `updated_at` changes
  are not covered by that fingerprint.
- Zero Private location violations, zero unverified coordinates and zero
  mismatches between stored canonical names/coordinates and their catalog rows.
- Anonymous catalog/search access and client catalog inserts denied; authenticated
  search permitted. Read-only authenticated-role checks confirmed London alias
  resolution, bounded search and accessible map aggregates. These SQL checks are
  not an end-to-end test of an iPhone session or submission.

No live QA prayer was created, deleted or expired for these checks. Application
changes follow the review branch; the backend rollout did not publish a website or iOS binary.

## iPhone Acceptance

Use the current Expo Go session and a verified QA account:

1. Open Submit, search London and select London, England, United Kingdom. Submit
   a public prayer; open its hotspot and check the new prayer appears there.
2. Search Kampala and select Kampala, Uganda. Check the result displays correctly
   in both light and dark modes, including with the keyboard open.
3. Search Springfield and distinguish results using the displayed region/country.
4. Leave a search unfinished and submit: check the selection/clear message. Clear
   it, submit without a location, and confirm the prayer is in Public, not the map.
5. Tap auto-detect, accept foreground permission and check the chosen city. Try
   denied access too: the draft stays and manual search/omission still work.
6. Start auto-detect then manually select another city: the later detection must
   not replace your choice. Switch to Private and check location disappears and
   the private prayer saves without it.
7. Check legacy prayers and existing links remain readable. Private/Circle prayers,
   blocked authors and expired public prayers must not add public hotspots.

Record the device/iOS, candidate revision, account aliases and actual results in
the QA checklist. Do not mark this story Done from database tests alone.

## Remaining Scope

`SCRUM-85` still owns the dedicated hotspot contract and removal of raw-row error
fallback. `SCRUM-86` still owns complete cursor pagination; native location detail
currently stops at 50 rows. Precomputation, clustering and scale benchmarking remain
`SCRUM-87`-`SCRUM-89`. This catalog does not establish map-scale/NFR acceptance.
