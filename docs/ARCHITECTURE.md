# Oratio High-Level Design

Last reviewed: 2026-10-21. Scope: the iOS product, supporting web services and
shared backend, including the canonical-place checkpoint. This is design, not release approval.

Start with the [design index](./design/README.md) for requirements, domain LLDs
and requirements-to-Jira-to-test traceability. Dated deployment and acceptance
evidence stays in the [release checklist](./V1_RELEASE_READINESS.md),
[NFR register](./NFR-CHECKLIST.md) and [feature runbooks](./backlog/README.md).

## 1. Product And Boundaries

Oratio connects people through shared Christian prayer. The Expo/React Native
iOS app is the primary product. Public Apple App Store release comes first;
Android distribution is post-launch under `SCRUM-79`.

Web owns public information, policy/support, authentication handoffs, authorised
shared-link fallback and protected operational tools. Its current deployment
also serves extra authenticated app screens; their removal/public-home conversion
is later work under `SCRUM-74`, not already deployed or a second product roadmap.
The [website plan](./backlog/WEB-PRESENCE.md) defines what must remain.

Mobile implementation and Expo Go acceptance precede signed-build validation.
TestFlight entry requires release approval and active Apple Developer Program
membership. Website conversion belongs to release preparation, as defined in
[release readiness](./V1_RELEASE_READINESS.md).

Actors are signed-out visitors, authenticated prayer authors/readers, accepted
Circle peers, explicitly authorised moderators and separately authorised notice
administrators. A normal account cannot become an administrator through profile
editing. Public prayer means discoverable to eligible signed-in users, not an
unauthenticated database read or a bearer link that bypasses access checks.

## 2. System Context

```text
People using iOS                         Visitors / moderators / notice admins
        |                                             |
Expo iOS app                                  React/Vite web app
apps/mobile                                   apps/web (Netlify)
        |                                             |
        +---------- packages/shared ------------------+
                   queries, types, validation
                              |
                   Supabase SDK + session JWT
                              |
       +----------------------+--------------------------+
       |                      |                          |
 Auth / PostgreSQL       Storage: avatars         Realtime changes
 tables, RLS, RPCs       object policies          comments / Updates
       |
       +--- Edge Functions: translate -> Google Translation
       |                    delete-account -> Auth admin API
       |
       +--- no privileged server key in either client

Independent operational path:
  iOS notice banner -> Netlify notice function -> context-isolated Blobs store
  web notice editor -> token verification + admin allowlist -> conditional write

Optional error path:
  iOS privacy-filtered JS errors -> Sentry (explicit configuration required)
```

These are logical boundaries, not separate databases per client or EAS profile.
A preview build configured for the live backend still reaches live data.

## 3. Component Ownership

| Component               | Responsibility                                                                              | Must Not Own                                                |
| ----------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `apps/mobile`           | Native navigation, UI, permissions, session storage, lifecycle and platform adapters        | Privileged credentials or final authorisation decisions     |
| `apps/web`              | Supporting website, moderator/notice tools and web handoffs; public-home conversion pending | A separate full prayer product or conflicting domain model  |
| `packages/shared`       | Supabase query operations, mapping, validation, location/username helpers and contracts     | React Native/DOM UI or platform storage                     |
| `supabase/migrations`   | Schema, constraints, triggers, RLS, grants and RPCs                                         | Mutable edits to applied migrations                         |
| `supabase/functions`    | Translation integration and authenticated account deletion                                  | Trust in a caller-supplied account ID                       |
| Netlify notice function | Independent notice publication/read path                                                    | Product data access or blanket moderator-to-admin authority |

Each app registers one Supabase client before importing query modules. Shared
queries obtain it through `setSupabaseClientProvider`. Web compatibility files
re-export shared logic. A replacement custom REST API with `/users` or `/prayers`
endpoints is not part of this architecture.

## 4. Navigation And Journeys

Native auth stack: Login, Sign Up and Reset Password. Signed-in tabs: Public,
Map, Prayer Circle, Private and Me. Stack destinations include Submit, Prayer
Detail, Location Prayers, My Prayers, User Profile, Circle Management, Settings,
Blocked Accounts and Updates. Exact types live in
[`navigation/index.tsx`](../apps/mobile/src/navigation/index.tsx).

```text
screen validates draft and marks action busy
  -> shared operation obtains current identity
  -> Supabase table operation or scoped RPC
  -> database checks identity + audience + restrictions + constraints/quota
  -> map authoritative result to domain model
  -> show actual outcome; refresh affected views
```

Comments and Updates use Realtime plus ordinary refetch paths; this is not a
fully synchronised offline system. Updates also refresh on foreground and poll
while active. Expiry clocks remove stale loaded public content and refresh map
totals at deadlines; the server remains authoritative for actual access.

Web `/prayer/:id`, `/moderate`, `/admin/service-notices` and `/user/:name` are
auth-gated routes outside the main web app-shell layout. Policy/support and
password-update routes remain public. See
[`routes.tsx`](../apps/web/src/app/routes.tsx) for the actual route map. HTTPS
prayer links currently use web fallback; producing a URL does not establish
production universal-link association or signed-iOS routing.

## 5. Data And Authorisation

The candidate contains migrations **001-045**. Application of 042/043 to Oratio_DB
was verified on 2026-10-19; 044/045 were approved, applied and verified on
2026-10-21. Evidence is in the [expiry rollout record](./backlog/PUBLIC-PRAYER-EXPIRY.md)
and [canonical-place record](./backlog/CANONICAL-PLACES.md). This is not a fresh
live-schema audit on every document read or a native release-acceptance claim.

| Domain     | Main Records                                                          | Boundary                                                                                |
| ---------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Identity   | Auth users, `profiles`, `profile_username_aliases`                    | Current identity; restricted writes; historical usernames reserved                      |
| Prayer     | `prayer_requests`, `prayer_interactions`, `saved_prayers`, `comments` | Ownership, audience, expiry, moderation and blocks compose                              |
| Places     | `prayer_places`, `prayer_place_aliases`                               | Read-only authenticated city catalog; server-derived place identity and fixed centroids |
| Circle     | `prayer_circle_invites`, `prayer_circle_connections`                  | Explicit acceptance; 12 accepted peers per user; blocked pairs excluded                 |
| Activity   | `activity_events`                                                     | Recipient-owned events; related content still requires access                           |
| Safety     | `reports`, `moderated_content`, `moderation_actions`, `user_blocks`   | Reporter scope, report-scoped review, private decision notes and caller-owned blocks    |
| Operations | `rate_limits`, `waitlist`; notices in Netlify Blobs                   | No client quota-table/waitlist reads; separate notice admin authority                   |

Legacy `follows` and `push_subscriptions` remain in the schema. They do not imply
a current follow or native push-notification product. Removal needs a future
migration and impact review.

Audience rules, additionally restricted by moderation and bilateral blocking:

- Public: eligible signed-in readers while active; owner retains expired history.
- Circle: owner and currently accepted peers; no anonymous submission and at
  least one accepted peer required to publish.
- Private: owner only; no public map entry, sharing or location requirement.
  Private comments are presented as owner-only Notes.

Public prayers are active for 336 elapsed hours, then leave discovery without
deletion. Only the owner may renew an expired, non-hidden public prayer. Renewal
keeps its ID, original creation time, comments and counts. Circle/private prayers
do not expire. Archive is deadline-derived, not answered status or a deletion job.

Clients are untrusted. RLS, column grants, constraints and caller-checking RPCs
enforce server rules even when a UI is bypassed. Avatar object policies are a
separate boundary. Service-role credentials belong only in trusted server code.
Anonymous public display hides UI attribution; it does not erase the underlying
account relationship or claim cryptographic anonymisation.

## 6. Decisions And Tradeoffs

| Decision                             | Reason / Consequence                                         | Detail                                                                  |
| ------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| iOS-first shared-backend monorepo    | Reuse contracts without making web delivery a native release | [Identity LLD](./design/lld/IDENTITY-AND-ACCESS.md)                     |
| SDK + RLS and scoped RPCs            | Centralise authority; client validation is insufficient      | [Safety LLD](./design/lld/SAFETY-AND-MODERATION.md)                     |
| City/country map aggregates          | Show community activity, not device pins                     | [Discovery LLD](./design/lld/PRAYERS-AND-DISCOVERY.md)                  |
| Retained archives + explicit renewal | Keep discovery current without losing owner history          | [Lifecycle LLD](./design/lld/PRAYERS-AND-DISCOVERY.md#public-lifecycle) |
| Consent-based single Circle          | Avoid unilateral grants and multi-group complexity           | [Circle LLD](./design/lld/CIRCLE-AND-ACTIVITY.md)                       |
| Report-scoped web moderation         | Safety review without blanket access to private libraries    | [Safety LLD](./design/lld/SAFETY-AND-MODERATION.md)                     |
| Independent nonblocking notices      | Inform users during some backend incidents                   | [Operations LLD](./design/lld/OPERATIONS-AND-DELIVERY.md)               |
| Optional on-demand translation       | Preserve the readable original on provider failure           | [External LLD](./design/lld/EXTERNAL-SERVICES.md)                       |

## 7. Known Gaps Versus Target Design

Do not treat a design target or a Done foundation story as release acceptance.

- Canonical place IDs and server-derived fixed centroids are implemented, with
  044/045 live; native changes are on the review branch and await device acceptance (`SCRUM-84`).
  The dedicated aggregate-only hotspot contract, request-based logarithmic size
  and explicit native failure handling are implemented locally (`SCRUM-85`);
  the maintainer-reported iPhone hotspot/offline-retry smoke check passed on
  2026-10-21, with wider acceptance open. Native location detail supports composite
  cursor pages and separate last-refresh totals (`SCRUM-86`, implemented/tested
  locally; device paging acceptance open). Candidate revisions and CI are tracked
  in [draft PR #5](https://github.com/Rkigozi/oratio_global/pull/5).
  Clustering/precomputation and million-row benchmarks are later work.
- Not every saved/prayed/Circle helper is paginated. Remaining retrieval limits
  need review under `SCRUM-95`; current tests do not prove unlimited history or scale.
- Native request deadlines, explicit read retry, account-state boundaries and
  same-ID prayer-submission retries are implemented and tested locally under
  `SCRUM-95`. Other write journeys, device fault acceptance and measured release
  performance remain open; see the [resilience record](./backlog/NATIVE-RESILIENCE.md).
- Translation-provider access, deployed gateway authentication and signed-build
  verification are distinct from the implemented adapter.
- Native monitoring has a privacy-filtered JS foundation and confirmed Expo Go
  event/email delivery. Full payload/native crash, analytics and signed-build
  acceptance remain open (`SCRUM-43`); see the monitoring record.
- Apple enrolment, signed distribution, accessibility/performance evidence,
  backup restoration and final security/release sign-off remain open. The scoped
  development dependency exception is not external-release permission.

The [traceability register](./design/TRACEABILITY.md) maps these gaps to existing
stories. Documentation does not silently add features or close those stories.

## 8. Delivery, Verification And Change Control

Root npm workspaces and lockfile own installation. CI uses Node 22 with separate
web, mobile and disposable PostgreSQL jobs. Web runs type/lint/test/coverage/build
and dependency checks; mobile runs type/tests, security-backport checks, JS export
and the bounded review audit. Database tests cover migration/security behavior
and concurrency. File-level commands/tests belong in each LLD, not rolling counts
in the HLD.

Expo Go is development delivery. An iOS JS/Hermes export is not a signed binary.
EAS profiles are prepared; signing, a candidate build and TestFlight acceptance
are separate. Pushing `main` deploys the web via Netlify, not iOS. Apply approved
schema changes before dependent clients; use reviewed forward migrations for
backend corrections.

Release evidence is defined in [NFR-CHECKLIST.md](./NFR-CHECKLIST.md), not inferred
from feature tests: security/privacy, failure recovery, measured performance,
accessibility, telemetry/alerts, isolated restoration, operational ownership and
signed-build reproducibility.

For each change: update its requirement/LLD, link the existing epic/story, update
code/tests and record scoped QA. Adjust release status only when acceptance is
met. Keep historical results dated rather than relabelling them for a new build.
