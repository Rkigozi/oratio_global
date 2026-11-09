# Public Prayer Expiry

Last updated: 2026-10-20. Story: [SCRUM-98](https://oratio.atlassian.net/browse/SCRUM-98).
Status: **In Progress**. Backend rollout verified; implementation checkpointed
in `817b4b8` on the review branch. Wider device/release sign-off remains pending.
Parent: COMM / Community & Retention (`SCRUM-34`).

## Product Decision

- Public prayers are active for **14 elapsed days (336 hours)**. The server
  assigns the deadline; daylight-saving changes do not add/remove an hour.
- At the deadline they leave Public, the map/location lists and public profiles.
  Other people cannot bypass expiry through saved items, direct links, comments,
  interactions, reporting or activity queries. Existing report-scoped moderator
  review remains available for safety; no blanket archive access is granted.
- Nothing is automatically deleted. The owner retains the same prayer, original
  creation time, attribution, comments, saves and prayer count in My Prayers.
  Owner history loads earlier pages in bounded 50-row batches with retry feedback.
- An owner can renew an expired public prayer for a fresh server-managed window.
  It keeps the same link/ID and original creation date; it does not manufacture a
  new request, reset counts or bump the original posting date. Active, non-owned,
  non-public or moderator-hidden prayers cannot be renewed. Ordinary edits do not
  renew. Failed or simultaneous renewals cannot claim duplicate success.
- Private and Circle prayers do not expire. There is no countdown, auto-renewal,
  deletion job, push reminder, new analytics collection or engagement claim.
- Existing public prayers receive a full 14-day window **from rollout**, rather
  than disappearing immediately because they were created before this feature.

## Implementation

`043_public_prayer_expiry.sql` adds `public_expires_at`, an index, a server insert
trigger, restrictive visibility/write policies and the owner-authorized
`renew_public_prayer` RPC. Table updates are limited to the app's existing body
and comments-enabled controls; expiry, ownership, audience and timestamps cannot
be rewritten through ordinary client updates. Backend moderation/blocking rules
are retained. Map aggregates include only active public requests and return the
next deadline for refreshing counts.

Shared queries filter discovery **before** pagination, while owned history keeps
archives. Native and legacy-web views update at deadlines and on foreground,
disable archived sharing/new interactions, and show local date/time/timezone.
Submission-event caches lacking a server deadline reload authoritative data.

## Rollout Order

1. Obtain explicit approval for pending security migration 042 and new migration 043. Confirm the linked project is Oratio_DB (`tfwgoavbbudkxthjhnrx`) and read its
   current migration history; do not assume a previously recorded state is current.
2. Dry-run the ordered migrations and stop if anything other than the approved
   pending updates is listed. Record before/after aggregate content counts and
   moderator-role fingerprint without prayer text, emails or credentials.
3. Apply the verified migrations, then verify deadlines, constraints, grants, RLS,
   RPC security, map contract and migration history through read-only checks.
4. Only then distribute the client changes. New explicit column filters require
   043; deploying clients against an old schema will fail discovery queries.
5. Run the two-account physical-iPhone checks below. A disposable local database
   and mocked browser results do not establish live security/device acceptance.

### Live Rollout (2026-10-19)

The scoped deployment was approved. The linked project was verified as Oratio_DB (`tfwgoavbbudkxthjhnrx`),
history matched 001-041, and `supabase db push --linked --dry-run` listed exactly
042 and 043. Both were applied successfully through the CLI; read-only checks
confirmed migration history contained all 43 versions at this checkpoint.

- All **23 prayers** remain: 13 public, seven Circle and three Private. Prayer
  fingerprints excluding the new deadline and automatic `updated_at` field
  matched before/after, preserving IDs, body, ownership, creation date and counts.
- All **10 comments** and their full-row fingerprint were unchanged. Interaction
  (14), save (0), report (22) and profile (7) counts were unchanged. The one
  moderator and the complete profile/moderator-role fingerprint were unchanged.
- All 13 existing public prayers received the same full 336-hour rollout window,
  ending at `2026-11-02T13:02:21.331539Z`. No Circle/Private row has a deadline.
- The expiry constraint, index and trigger are active. All checked tables retain
  RLS, and the four new expiry policies are restrictive and authenticated-only.
- Effective client grants deny waitlist reads and direct quota-table access,
  preserve email/source waitlist inserts, and allow prayer updates only to body
  and comments-enabled columns. Clients cannot directly update expiry.
- Renewal/quota RPCs are authenticated-only security-definer functions with
  fixed search paths. Map aggregation remains security-invoker and exposes the
  `next_expires_at` result column. These are deployed catalogue checks, not a
  substitute for actual signed-in device/PostgREST journeys.
- A read-only transaction under the authenticated role confirmed missing-identity
  renewal/quota calls are rejected and map aggregation returns no rows without
  an identity. No account impersonation or live content write was used.

No existing prayer was deleted, manually expired or renewed to test rollout. No
moderator access was granted. The earlier 2026-10-18 connection timeout is resolved.
The client implementation is now checkpointed in `817b4b8`; `main` and external
distribution remain unchanged. Hosted checks for this candidate must be verified
separately rather than inferred from earlier CI runs.

If rollout needs to be stopped, use a reviewed forward migration; never edit an
applied migration, reset the backend or delete retained history as a rollback.

## Verification And Device QA

Review checkpoint (2026-10-20): feature commit
`817b4b892e2bfbcb3d7970217580587594a7300d` passed all **314 mobile** and **549 web**
tests, both type checks, web lint/build, formatting, iOS JS/Hermes export,
**183 disposable database assertions**, legacy-rollout fixtures, **11 concurrency
cases**, **10 isolated browser journeys** and **158 security-backport/policy
checks**. The mobile review audit passed under its existing bounded development
exception; this is not a clean raw audit or strict release clearance. All browser
backend requests used fake configuration/mocked services, not a live account.
Hosted candidate CI and broader device acceptance are separate gates.

Local checkpoint (2026-10-18): all **314 mobile** and **549 web** tests passed,
both type checks, web lint/build, repository formatting and the iOS JS/Hermes
export passed. The disposable database passed **183 assertions** (43 expiry,
37 security, 45 moderation, 58 blocking), legacy-rollout checks and **11 real
concurrency scenarios**, including double renewal and rollback/retry. All
**10 isolated browser journeys** passed on mobile WebKit and desktop Chromium;
light/dark archive and renewed screenshots were inspected without text overflow.
These client changes are not committed/pushed or tested on a physical iPhone at
this checkpoint. The backend rollout above followed on 2026-10-19. Earlier hosted
CI belongs to earlier commits.

Automated coverage: shared query/date boundaries and bounded history paging;
native archive/renewal/failure/sharing/feed/map clocks and background/resume;
disposable PostgreSQL ownership, spoofing, exact boundary, UTC/DST duration,
comments/saves/report access, blocking, moderation, count/history preservation,
legacy backfill and real concurrent renewals. Isolated Playwright checks cover
light/dark mobile WebKit and desktop, renewal, failed renewal, an open-screen
deadline and an expired shared link. No real account or remote write is used.

### Live QA Handoff (2026-10-20)

The initial Expo check was maintainer-reported. A disposable public QA
prayer, **Expiry QA just testing**, was created through the Jonah QA account (`qa_jonah`). Read-only inspection
verified ID `c21aee55-3d8b-4330-8044-0f8ff776ee31`, creation at
`2026-10-20T21:10:11.017227Z` and the server-assigned deadline at
`2026-11-03T21:10:11.022834Z` (336 hours, within insertion timing precision).

At this QA handoff, only that prayer's deadline was moved to
`2026-10-20T21:11:53.427993Z` to exercise archive/renewal. The transaction verified
the exact ID, owner, username, public audience, body and pre-inspection fingerprint,
and would roll back on a mismatch. Before/after fingerprints confirmed all other
prayer rows were unchanged and the target's other fields were preserved apart
from its normal automatic `updated_at`. Its prayer/comment counts remain zero.

The backend initially confirmed this test prayer was expired. A subsequent
read-only follow-up confirmed it is active again with deadline
`2026-11-03T21:13:52.932451Z`, after the original window. Its ID, original creation
time, zero prayer/comment counts and preserved-fields fingerprint match the
pre-expiry record. This verifies renewed backend state; the inspection itself
did not execute a renewal. Separate visual feedback, other-account visibility,
earlier-page history and nonzero-history device checks remain unconfirmed.

- [ ] On the approved backend, create a disposable public QA prayer and verify
      its displayed local deadline, active feed entry, location and shared link.
- [x] Shorten only the explicitly approved disposable Jonah QA prayer for the agreed
      expiry test (2026-10-20); transaction preservation checks passed. No bulk
      expiry or client authority to set deadlines was introduced.
- [ ] Keep another account's feed/detail open across expiry, then background and
      resume. Check map counts, location/profile lists, saved items and direct link.
- [ ] Owner: open the archived prayer in My Prayers, including an earlier history
      page. Renew once and verify the same ID, comments, counts and restored link.
- [ ] Failure/repeated tap, blocked accounts and hidden-content renewal remain safe.
- [ ] Circle/private prayers remain available and have no renewal action.
- [ ] Light/dark, larger text, screen-reader names and safe-area checks pass on iPhone.

Commands: `npm run test:db`, `npm run test:mobile`, `npm test`, both type checks,
web lint/build, and `npm run test:e2e --workspace @oratio/web -- prayer-expiry.spec.ts`.
