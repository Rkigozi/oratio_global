# Service notices

Last updated: 2026-10-07

Jira: [SCRUM-97](https://oratio.atlassian.net/browse/SCRUM-97), In Progress,
High priority, V1 Launch, under OPS (SCRUM-35).

## Scope and current state

Notice administrators can preview and explicitly publish one short notice for iOS users.
The banner is dismissible and never disables app features. Display start and
expiry are required; title/message limits are 60/240 Unicode code points and
the display window is at most seven days. Publishing replaces the existing
notice, including a scheduled one. An optional maintenance window supplies the
actual start and end independently of the banner display period. Its dates and
times appear beside the title/details, converted into each viewer's device
locale/timezone with timezone labels. Both endpoints include their dates and
years so overnight windows and daylight-saving offset changes stay explicit.
Text-only notices remain supported; times are not inferred from message prose.

Implemented and deployed to an approved isolated Netlify draft.
Hosted API and browser checks passed; the basic Expo notice journey has a
maintainer-reported manual result. Detailed physical iPhone QA, including the new date line, remains
open. All disposable test notices have been withdrawn. The production deployment and
all non-test environment values were verified unchanged. No Supabase migration
is needed. Security migration 042 was not deployed at this checkpoint; its
subsequent rollout is recorded in the [security review](./SECURITY-REVIEW.md).

Test-access decision (2026-10-02): use the existing Miriam QA account as the temporary
notice administrator for isolated testing only. On 2026-10-06 an authenticated
Supabase lookup verified `qa_miriam` / `oratio.qa.miriam@example.com` as user
`cd4d43a1-4b3d-463f-bff5-89b8a708466b`. This ID is allowed only in the named test
deployment context; it has not been added to production. No database role was
granted and no shared account password was changed.

For launch, provision a dedicated operational account with a managed Oratio email
address and approve its verified user ID. The mailbox receives account messages;
it does not itself grant notice permissions. Replacing an account means updating
the server allowlist and verifying access; changing an existing account's email
does not change its user-ID-based access. Remove Miriam's test access when the
dedicated account is ready. Never turn the shared QA identity into the permanent
launch administrator or add the QA account ID to production by default.

Out of scope: blocking maintenance mode, push/email notifications, automatic
outage detection and multiple simultaneous notices.

## Design and safety

- Native reads `/.netlify/functions/service-notice` on the existing Oratio web
  host. The public response contains only notice copy, display times, optional
  maintenance times and revision.
- Admin date/time inputs use the browser's displayed timezone and are saved as
  UTC instants. Preview/current notice use the same formatter as native. Invalid
  or reversed maintenance windows are rejected by both editor and API. The
  editor rejects local times skipped by a daylight-saving transition; for a
  repeated local hour, check the offset shown in Preview before publishing.
- The Netlify Function stores notices in Netlify Blobs, independently of
  Supabase. An already published notice can still be read during a Supabase
  outage. Publishing requires a working Supabase authentication service, so
  publish planned notices before maintenance starts.
- Management verifies the caller's token against Supabase, then checks a
  server-only allowlist of approved user IDs. Being a moderator alone does not
  grant notice-admin access. An unset allowlist denies everyone.
- Strong-consistency reads and conditional writes reject stale updates. The
  editor preserves drafts and requires reload after a conflict. The record
  retains the latest actor/time, not a full decision history.
- The trusted function deployment context separates the published production
  store from each preview or unpublished deployment. Build-only `CONTEXT` and
  `DEPLOY_ID` environment variables are not used for this boundary.
- Native refreshes at launch, foreground and every minute while active. Cached
  notices can activate/expire locally while offline. Withdrawal is learned on
  the next successful fetch; an offline device can retain a withdrawn notice
  until its original expiry. A new revision is visible after dismissing an old one.
- The notice shell stays mounted around navigation so banner changes preserve
  drafts. Safe-area placement and larger text still need device verification.
- This is best-effort communication, not an uptime guarantee: a first-time
  offline user has no cached notice, Netlify can also fail, and device clock
  accuracy affects local scheduling. There are no notifications outside the app.

Provider references: [Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/),
[runtime context](https://docs.netlify.com/build/functions/api/),
[Functions environment](https://docs.netlify.com/build/functions/environment-variables/).

## Isolated QA deployment (2026-10-06)

- Admin: [test notice controls](https://notice-qa-20261006--oratiotest.netlify.app/admin/service-notices).
- Public endpoint: [test notice JSON](https://notice-qa-20261006--oratiotest.netlify.app/.netlify/functions/service-notice).
- Site: `oratiotest`; draft alias/custom branch context: `notice-qa-20261006`.
- Current QA deploy: `6ac57dcfc558d2cd35304da1` (date/time update, 2026-10-07).
  Previous hosted API/browser baseline: `6ac51ed324c364af3fa67824`. Production remains at
  `6aba7707c241350007b420ee`.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `ORATIO_NOTICE_ADMIN_IDS` each have a
  value only for this named test context. The site's plan does not support
  selective Functions-only scopes, so these use default scopes with the same
  strict context restriction. No production/all-context value was added, no
  service-role key was used, and the admin allowlist is absent from client JS.
  See [environment scopes](https://docs.netlify.com/build/environment-variables/overview/).
- Expo uses an ignored `apps/mobile/.env.local` override pointing to the public
  test endpoint. Existing `.env` values are unchanged. Restart Expo and reload
  the project when changing this URL. Remove the override after device QA and
  before using the normal production endpoint.
- Sign in to the test admin page as Miriam, preview and publish a short notice,
  then reload Oratio in Expo Go. Any app account can see the banner; only the
  approved admin can manage it. Withdraw the notice after testing.
- To show timing, enable **Include maintenance times** and enter both endpoints.
  Set the independent banner display period to cover the intended announcement
  period. Refresh the admin page and reload Expo after this schema update;
  older running clients do not understand the new structured field.
- A new draft deployment has its own notice store. Redeploying the alias does
  not carry its existing notice forward; verify the empty state before QA.

## Rollout procedure (production pending)

1. Verify the approved Miriam QA account's Supabase user ID through an
   authenticated lookup and obtain approval for the isolated deployment.
   Do not infer the ID from a display name or grant every moderator access.
   Production approval is separate from this temporary test-account approval.
2. In Netlify, configure `SUPABASE_URL`,
   `SUPABASE_ANON_KEY` (public publishable/anon key, never service-role) and
   `ORATIO_NOTICE_ADMIN_IDS` (comma-separated approved IDs). These are runtime
   variables, not entries in `netlify.toml`. Never expose the allowlist in a
   `VITE_` or `EXPO_PUBLIC_` setting. Restrict values to the intended deployment
   context; use Functions-only scopes where the plan supports them. Environment
   changes require redeployment. Production requires a separately approved ID.
3. Deploy an isolated preview. Verify its function can access Blobs, the
   endpoint returns JSON, anonymous management is 401, and non-admin management
   is 403. Confirm a preview write leaves the production store unchanged.
4. For Expo Go QA, set `EXPO_PUBLIC_SERVICE_NOTICE_URL` in the local mobile
   environment to the preview's HTTPS `/.netlify/functions/service-notice` URL,
   then restart/reload Expo. This is a public URL without tokens or `?manage`.
   The endpoint must be reachable from the phone without a hosting login wall.
   Cache/dismissal keys are isolated by URL. Remove the override after QA;
   leave it unset for the production app to use the normal Oratio host.
5. On that same preview host, open `/admin/service-notices` and sign in as the
   approved admin. A Service notices link is also available on `/moderate`.
   Fill in copy, choose display start/expiry in the displayed time zone, select
   Preview notice, then explicitly Publish notice. A preview is not a publish.
6. Complete the checks in `docs/QA-CHECKLIST.md`. Withdraw the disposable preview
   notice afterwards. No global production announcement is needed for QA.
7. With explicit approval, deploy to production, verify the empty endpoint and
   access controls, and include the native change in the release build. Do not
   publish a test message to real users. Confirm Functions/Blobs usage and cost
   against the site's plan before launch; each active client polls once a minute.

Normal operation after rollout: use the approved admin page to publish or
withdraw notices without another app release. Confirm the saved state after
publishing. If authorization or storage is unavailable, the page reports failure
instead of claiming success. An admin can withdraw immediately while connected;
offline copies still expire on their original schedule.

Plain Vite on port 5173 serves the UI but does not run Netlify Functions. A
local 'notices unavailable' message is expected without a function runtime.
The checked-in browser tests mock auth/notice calls. The separate hosted checks
below exercised real authentication, the function and Blobs on the test host.

## Date/time evidence (2026-10-07)

- 49 focused web tests and 11 native notice tests pass. Coverage includes
  optional/ordered UTC maintenance fields, API round-trip, unchanged display
  timing, local formatting in New York/Tokyo/Kolkata/Kathmandu, quarter-hour
  offsets, repeated DST hours, midnight/year rollover and offline cache data.
- Six mocked browser checks pass in Chromium/desktop and WebKit/phone-width:
  preview/publish/withdraw in light/dark, UTC submission from London inputs and
  rejection of a local time skipped by daylight saving. Screenshots inspected;
  date lines wrap and editor controls remain reachable. Repeated successfully
  against the deployed QA site's assets with authentication/writes still mocked.
- Deployed build and public endpoint smoke check pass; no notice was published
  for this update. Production deploy/environment fingerprints remain unchanged.
- Web/mobile type checks and web lint/format checks pass. The existing basic Expo success
  does not count as physical-device verification of the newly added date line.
- Still pending: publish a fresh timed notice, reload Expo, confirm title,
  details and local date/time; change the device timezone and foreground the
  app to confirm conversion without changing the saved UTC instants. Repeat
  with larger text and a cross-midnight window, then withdraw the test notice.

## Hosted evidence (2026-10-06)

- Fixed a real deployment packaging failure: tracing the bare workspace schema
  import produced two files at the function's ZIP path, causing a 502. The
  handler now imports the workspace source relatively so it is bundled. Added a
  packaging regression test; inspected the successful ZIP for duplicate paths.
- 30 focused web tests, eight native notice tests, web type-check/lint and the
  deployed web build pass. This is focused verification, not a new full-suite run.
- Ten real hosted API checks pass: empty public read; missing/invalid token and
  Jonah access denial; Miriam management; cross-origin denial; publish/public
  field privacy; stale-write rejection; withdrawal; expiry; empty cleanup state.
- Two real browser journeys pass: desktop Chromium/light and phone-width
  WebKit/dark, with Miriam login, preview, publish, withdrawal and overflow checks.
  Screenshots inspected. These are not physical iPhone/Expo acceptance evidence.
- Published production deploy and all non-test environment values/scopes were
  fingerprinted before setup and verified unchanged after the final deployment.
- Local artifacts: `/private/tmp/oratio-notice-live-qa-results.json` and
  `/private/tmp/oratio-notice-browser-qa/` (temporary, not durable release evidence).
- Expo Go server started using account `oratio_global` and the isolated URL.
  Device banner rendering, dismissal, offline/scheduling behavior and draft
  preservation remain manual acceptance checks. SCRUM-97 stays In Progress.

## Local evidence (2026-09-30)

- 29 focused web tests: public read during auth outage, access denial, strict
  validation, body limits, conditional writes, expiry, preview/production store
  isolation, preview-before-publish, failed saves and stale-editor recovery.
- Eight native notice tests: caching, dismissal/new revision, scheduling and
  expiry, foreground/background behavior, endpoint override and mounted drafts.
  Notice plus build-config suites pass 33 tests, including preview URL guards.
- Four mocked browser journeys pass: mobile WebKit and desktop Chromium in
  light/dark mode, preview/publish/withdraw, width and scroll checks. Screenshots
  were inspected; the editor owns its scroll area so actions remain reachable.
- Final full suites pass: 514 web tests and 246 mobile tests. Web/mobile type
  checks, web lint/build and an iOS JS/Hermes export pass locally. The Function
  bundles with esbuild for Node 22 and imports without deployment credentials.
  None of these substitutes for a hosted smoke check or physical iPhone QA.

Relevant source/tests: `apps/web/server/service-notice*`,
`apps/web/netlify/functions/service-notice.ts`,
`apps/web/src/app/pages/service-notices*`, `apps/web/e2e/service-notices.spec.ts`,
`apps/mobile/src/hooks/use-service-notice*`,
`apps/mobile/src/components/service-notice*`, and
`packages/shared/src/service-notice.ts`.
