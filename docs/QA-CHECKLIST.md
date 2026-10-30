# Oratio Native V1 — QA Checklist

Scope: physical-iPhone functional acceptance for the iOS product. Use Expo Go
during development and repeat the critical set in TestFlight after distribution
entry approval. Supporting-website/admin checks cover retained services separately.

Manual results labelled **maintainer-reported** record the project maintainer's
observations; they are not independently reproduced QA results. Preserve the
recorded date, scope and open follow-ups when reusing this evidence. Named QA
accounts are test aliases, not staff assignments or production operator identities.

QA workbook: [oratio_v1_qa_smoke_test_workbook](https://docs.google.com/spreadsheets/d/1SUlp0WxPbaROUWlg37LXuNgC99F--lPEzSoTICU5zB4/edit).
Partial sync on 2026-09-26 added confirmed reporting/moderation follow-up evidence to
`REPORT-001` and `MOD-002`, including the iPhone report-limit warning retest.
That workbook sync is historical and partial, not a current migration ledger or
live mirror. This checklist and linked feature records own current iPhone evidence.

## Test Prerequisites

Canonical-place checkpoint (2026-10-21, `SCRUM-84`): approved migrations
044/045 are applied and read-only-verified on Oratio_DB. Native/shared changes
remain local. 330 mobile tests, 566 web/shared tests, 214 disposable SQL assertions,
11 concurrency cases, both type checks, web lint/build and iOS JS export passed.
The [place record](./backlog/CANONICAL-PLACES.md) contains source/licensing,
preservation evidence and Expo Go steps. Physical-device checks below remain open.

Use the [active design baseline](./design/README.md) and
[traceability register](./design/TRACEABILITY.md) to identify the requirement,
LLD and story behind each changed journey. Use [release readiness](./V1_RELEASE_READINESS.md)
to distinguish development acceptance from signed-build acceptance.

Public-prayer expiry (`SCRUM-98`): migrations 042/043 were applied to Oratio_DB
and verified on 2026-10-19, with content and moderator access preserved. Client
implementation is checkpointed on the review branch. The
[expiry runbook](./backlog/PUBLIC-PRAYER-EXPIRY.md) defines remaining device
acceptance, exact behavior and two-account checks. Backend checks are not a device pass.

Security rollout (2026-10-19): [migration 042 and its regression evidence](./backlog/SECURITY-REVIEW.md)
include deployed RLS/grant and migration-history checks. Retest relevant signed-in
prayer/comment and quota-error journeys before external beta; the later website
pass covers its waitlist if retained. Catalog/SQL checks do not replace client QA.

- [ ] Record the tested branch/commit and any local changes; use an exact clean committed candidate for the later signed-release pass
- [x] Apply all Supabase migrations through `040_reporter_details.sql` (Oratio_DB local/remote migration history aligned, 2026-09-23)
- [x] Apply migrations 042/043 after verifying 001-041 alignment (Oratio_DB, 2026-10-19); read-only content, role, deadline and permission checks passed
- [x] Apply migrations 044/045 with recorded deployment approval and verify preserved prayer history, canonical locations and effective access (Oratio_DB, 2026-10-21; see place record)
- [ ] Prepare three verified test accounts with distinct usernames, profiles, and avatars
- [ ] Account A is new or intentionally empty; Account B owns representative public, Circle, and private prayers; Account C is an accepted Circle peer
- [ ] Connect B and C before creating B's Circle prayers; an empty Circle cannot publish, and A initially stays outside B's Circle for non-member visibility checks
- [ ] Keep Account B signed in on the physical iPhone and Accounts A/C in separate browser or device sessions
- [ ] Confirm all sessions reach the same Supabase project before testing Circle, privacy, comments, and Updates
- [ ] For signed-build acceptance: record the version/build, EAS build ID and Git commit; these identifiers are not required for an Expo Go development check

## Authentication (email/password only)

**Sign up**

- [ ] Sign-up screen creates an account with email + password + username
- [ ] No social sign-in option is shown on sign-up or sign-in
- [ ] Email verification screen appears when Supabase requires confirmation
- [ ] Profile row auto-created in Supabase

**Sign in / out**

- [ ] Valid credentials sign in and land on Public prayers
- [ ] Wrong password shows an error; empty fields show a validation message
- [ ] "Forgot password?" sends a reset email and the recovery path is understandable
- [ ] Sign out returns to Login

**Guards**

- [ ] App restart restores a valid session without briefly showing the wrong identity or screen
- [ ] Expired/removed sessions return to Login cleanly
- [ ] Background and foreground transitions preserve or refresh the session
- [ ] Switching between the three QA accounts never leaks the previous profile, prayer spaces, counts, avatar, or cached private content

## Prayer Spaces

- [ ] Public tab loads only recent public prayers and paginates on scroll
- [ ] Prayer Circle tab loads only prayers visible through accepted circle connections
- [ ] Private tab loads only the signed-in user's private prayers
- [x] Accounts A and B cannot see each other's Private prayers after connecting through Prayer Circle (maintainer-reported two-account UI check, 2026-09-19)
- [ ] Empty states clearly describe each space
- [ ] Pull-to-refresh works in all three spaces
- [ ] Bottom-tab icons have stable 44pt+ targets and respect the iPhone safe area across Public / Map / Circle / Private / Me

## Submit

- [ ] Text required (10–500 chars); validation messages shown
- [ ] City search selects a recognized city/region/country; London and Kampala are available, similar names are distinguishable, and an unfinished search asks for a selection or clearing
- [ ] Search loading, empty, failure and retry preserve the prayer draft; a late search/detection result never replaces a newer manual selection
- [ ] Blank location is stored as unknown and never becomes a random map point
- [ ] "Use my current location" requests foreground access only when tapped, fills city and country, stores only the coarse city map point, and leaves manual entry available when permission or reverse-geocoding fails
- [ ] Anonymous is offered only for Public and hides attribution there
- [ ] "Let people encourage me" controls comments for Public prayers only
- [ ] Audience: public / Prayer Circle / private — private prayers only in the owner's private list
- [ ] An empty Circle blocks submission with an accepted-connection message and Circle management action, without an insert/RLS error; Public and Private remain available
- [ ] Circle checks distinguish network failure from no accepted connections; retry or return from Circle management rechecks eligibility and preserves the draft, and save rechecks a connection removed on another device
- [ ] Audience is selected before location; Private shows prayer text and Save Prayer with no location or public preferences
- [ ] Switching to Private clears entered location; a late location detection result or error is ignored, including after switching back
- [ ] Starting from My Prayers uses its selected audience; Write a private prayer and Write another prayer in Private keep Private selected
- [ ] A new private prayer saves without city, country, or coordinates; failed saves preserve the private draft for retry
- [x] Post-submit return to the main journey works in the maintainer's reported retest (confirmed 2026-09-19); the full audience and Back-history checks below remain open
- [ ] Success offers a one-tap return to the submitted audience's Public/Circle/Private main tab, restores bottom navigation, and removes the completed composer from Back history
- [ ] Success still offers View Prayer and another submission; View Prayer's Back returns to the matching main tab instead of the old success screen, and failed saves never navigate away

## Global Map

- [x] Expo Go iPhone hotspot selection and offline → reconnect → Retry smoke check passed (2026-10-21, maintainer-reported on the local uncommitted candidate; device/iOS version not recorded). This is not the wider map or signed-build acceptance pass.
- [ ] Map tab opens a full-screen world map without a blank or crashed native view
- [ ] Only public prayers with valid locations appear as hotspots
- [ ] Selecting a hotspot shows the correct prayer-request and people-prayed totals
- [ ] Marker size follows active request activity only; increasing people-prayed counts alone does not enlarge it, and a data refresh updates its size
- [ ] "View [location] prayers" opens only public prayers from that location
- [ ] Canonical hotspot drill-down uses place identity, not just matching display names; unmapped legacy prayers remain readable but have no fabricated map marker
- [ ] London-area names such as Greater London appear together as London
- [ ] The bottom-right "Go to my location" control requests foreground access only when tapped, recentres in one tap, leaves pan/zoom and hotspots responsive, and never changes a prayer's stored location
- [ ] Denied or unavailable location access shows clear guidance without blocking the map
- [ ] Pull down on a location prayer list refreshes it; map refresh remains responsive
- [ ] Unavailable/invalid map totals show a retryable error, not a quiet empty map or individual-prayer markers; reconnecting and Retry restores valid hotspots
- [ ] A failed refresh clears previous marker totals and selection; an expired aggregate disappears even if reloading fails, and a late response after leaving the map cannot replace newer data
- [ ] A city with more than 50 active matching prayers loads subsequent pages in stable order without duplicates; the last-refresh total remains separate from loaded rows
- [ ] A failed next page retains existing rows and offers Retry loading more; reconnecting and retrying continues from the same cursor
- [ ] Pull-to-refresh replaces all loaded pages, cursor and total together; new prayers appear at the top and an older in-flight page cannot append afterward

## Prayer Detail

- [ ] "Pray for this" toggles to "Prayed for this" and increments the count
- [ ] Opening an unavailable/deleted prayer shows a calm unavailable state
- [ ] Back returns to the previous native screen
- [ ] Public and Circle prayers show comments; a comment can be added and edited
- [ ] Replying to a comment or reply creates a single-level threaded reply
- [ ] A user can delete their own comment; the prayer author can remove another user's comment
- [ ] A Public prayer author can turn comments off and on from prayer detail
- [ ] A private prayer shows personal Notes, not social comment/reply language
- [ ] Private prayer lists and detail hide location (including on older prayers), author links, social prayer counts, and the Pray for this action
- [ ] Private notes can be added, edited, and deleted and are never visible to another user
- [ ] An owner can edit a valid 10-500 character prayer; invalid edits stay open with clear guidance and successful edits show as Edited
- [ ] Deleting an owned prayer requires explicit confirmation, returns to the matching My Prayers tab rather than the stale submission success screen, and removes it from its feed, Profile count, and map aggregates
- [ ] A non-owner never sees Edit or Delete, including when opening a shared link directly
- [x] Copy link and Share prayer both work in the physical iPhone retest after the share-sheet sequencing and clipboard feedback fix (maintainer reported, 2026-09-14)
- [ ] Public and Circle Share opens the native iOS share sheet with safe attribution and the authenticated web prayer link, without copying prayer text or location
- [ ] Share, Edit, Report, and Delete open only after the prayer-actions sheet finishes closing; repeat taps do not open duplicate sheets
- [ ] Copy link copies only the prayer URL and shows "Link copied to clipboard." after success; paste into Messages or Notes to verify
- [ ] Native Share distinguishes completed sharing, Copy, and cancellation; cancelling never claims the link was copied or the prayer shared
- [ ] Copy/share failures show clear feedback and allow retry or the alternative action, without leaving prayer detail
- [ ] The shared web prayer link returns to the same prayer after sign-in; inaccessible Circle prayers remain protected by Supabase policy
- [ ] Private prayers do not offer Share or Copy link
- [ ] A prayer in another language offers translation into the saved Settings language on detail only; feed rows never translate automatically
- [ ] Translation success shows source and target language context; Original and translated views toggle without another network request
- [ ] Translation failure or an unnecessary translation leaves the original prayer readable with a recoverable message
- [ ] Live Google translation succeeds after Cloud billing is reactivated; no prayer text or personal data appears in client logs or telemetry
- [ ] Reporting is retested alongside translation on prayer detail

## Prayer Circle

- [x] Connected members see explicitly shared circle-only prayers (maintainer reported between Accounts A and B, 2026-09-19)
- [ ] A non-member cannot fetch a circle prayer directly
- [ ] Circle header management icon opens the management screen and Back returns to Circle prayers
- [ ] Searching by exact or partial `@username` finds another user but never the signed-in user
- [ ] Sending an invite immediately shows it under Invites sent; Cancel removes it
- [ ] The recipient sees the invite and can accept or decline it
- [ ] Accepting adds both users to each other's Circle and updates the filled-space count
- [ ] Removing a member requires confirmation and removes the relationship for both users
- [ ] Connected and pending users cannot receive duplicate invites
- [ ] At 12 accepted connections, new invites and accepts are blocked without breaking the screen
- [ ] Pull-to-refresh reflects an invite response made on another device/session

## Profile & Settings

- [ ] Me bottom tab opens Profile; Settings opens from the Profile header
- [ ] Profile shows display name, username, bio, location, avatar, joined date, and public/circle/private prayer counts
- [ ] Tapping a named prayer author or Prayer Circle person opens their profile and visible prayer list; anonymous prayers never appear on an author's profile
- [ ] Another person's profile offers Invite to Prayer Circle, confirms a successful send, and allows cancelling a pending invite; the signed-in user's own profile never offers it
- [ ] Profile Circle actions support accepting/declining incoming invites, refresh visible prayers after acceptance, and open Circle management for existing connections
- [ ] Profile Circle actions prevent repeat taps and inviting/accepting beyond 12 connections; failed status checks and actions show recoverable feedback without falsely claiming success
- [ ] Returning to or pulling down on a profile refreshes its Circle state; profile Circle actions remain legible in light/dark mode and with long usernames
- [ ] My Prayers opens from Profile; each count opens the matching Public, Circle, or Private owner list and returning from detail refreshes edits/deletions
- [ ] Editing username/display name/bio/location saves through Supabase and refreshes the app identity immediately
- [ ] Username continuity works after a username change; old web profile links still resolve through aliases
- [ ] Avatar upload requests photo access, crops square, stores in Supabase Storage, and refreshes Profile
- [ ] Settings toggles in-app Updates for prayers offered, comments/replies, and default comments on public prayers
- [ ] Translation language preference saves and survives reopening Settings
- [ ] Light, dark, and system themes apply across every native tab and persist across relaunch
- [ ] Switching the device appearance while System is selected updates the app without unreadable or incomplete screens
- [ ] Account deletion requires two deliberate confirmations; success returns to Login and failure preserves the session
- [x] Live disposable-account deletion removes the auth user, profile, and dependent prayer, clears the local session, and rejects the old credentials (`npm run qa:account-deletion`, 2026-09-13)
- [ ] Privacy, terms, Oratio support, and country-specific crisis support links open the production destinations from Settings
- [ ] Sign out from Settings returns to Login and a restart does not restore the old session

## Updates & Moderation

- [ ] Public-header bell opens Updates; the bottom bar remains limited to four prayer spaces
- [ ] Updates shows comments, replies, prayers offered, Circle activity, and report reviews
- [ ] Bell badge appears without changing screens when another account creates an update
- [ ] Opening Updates marks visible events read and clears the badge
- [ ] Several people praying for the same prayer appear as one grouped update with the right total
- [ ] Tapping a prayer update opens that prayer; tapping Circle activity opens Circle management
- [ ] Pull-to-refresh reloads activity; foregrounding the app catches activity received while away
- [ ] Deleting an update requires confirmation and removes only that user's inbox event
- [ ] Realtime failure does not block the inbox; foreground refresh and polling remain functional
- [x] Another account's public prayer can be reported by choosing a reason; the success confirmation appears (maintainer-reported Miriam/Jonah QA flow, 2026-09-21)
- [x] Reporting the same prayer again shows the already-reported message (maintainer-reported, 2026-09-21)
- [x] Comment menus allow eligible users to choose a report reason and submit it; success and duplicate-report states are clear (maintainer reported this flow was already tested, 2026-09-26)
- [x] Comment reporting waits for explicit Submit after reason/details entry, then the correct comment and reporter details appear in moderator review (maintainer reported this flow was already tested, 2026-09-26)
- [x] New report-details character-limit warning works on the physical iPhone after the feedback fix (maintainer-reported, 2026-09-26)
- [ ] Retest prayer/comment reporting on iPhone: reason selection alone does not send, exactly 1000 details characters remain valid, longer drafts are preserved with a clear excess-count warning and disabled Submit, and shortening clears the error
- [x] Report form scrolls with the iPhone keyboard open in light/dark mode; details, character warning and Submit remain readable and reachable (maintainer-reported, 2026-09-26)
- [x] Automated report-length regressions cover both forms, the 999/1000/1001 boundaries, untruncated drafts, shortening/re-enabling Submit, and Unicode counting in the UI and shared save guard; web feedback visually checked at desktop and phone widths without submitting a report (2026-09-26)
- [x] Prayer/comment reports submit successfully with a reason and no optional details (maintainer reported this flow was already tested, 2026-09-26)
- [x] Report details reach moderator review but are unavailable to the reported author or unrelated accounts (maintainer-reported, 2026-09-26)
- [x] Submitting a report while offline shows a clear error and preserves the reason/details draft; reconnecting and retrying succeeds without duplicate reports (maintainer-reported, 2026-09-26)
- [ ] Report authentication-error states are clear
- [ ] Reports reach the moderation queue without changing private or Circle visibility
- [x] Local moderation tests apply all migrations through 040 and verify moderator-only review/actions, Private isolation, hide/restore across direct reads, map totals, comment threads, activity previews, audit privacy, stale-decision rejection, and reporter-details limits/RLS (`node scripts/test-moderation-db.mjs`, 2026-09-23; 45 assertions in a disposable database)
- [x] Migrations 039 and 040 applied to Oratio_DB with recorded deployment approval; existing signed-in moderator can load a real Circle report in the local web dashboard (2026-09-23; read-only verification, no roles or content changed)
- [ ] Deploy the updated web moderation UI and native report form; confirm the dedicated approved launch moderator account and ownership
- [ ] Moderator reviews a real QA prayer/comment, supplies a decision reason, confirms Hide, and sees the related reports resolve; another account cannot fetch the hidden content
- [x] Restore the recent public QA prayer: after refreshing Expo it reappears for Miriam and Jonah; the report stays Resolved and decision history records Hide and Restore (maintainer-reported, 2026-09-24)
- [x] Hide a disposable Circle prayer, refresh Expo to confirm it disappears, then Restore: the author and accepted Circle member see it again, an unconnected account still cannot, and the report remains Resolved with Hide/Restore history (maintainer-reported, 2026-09-26)
- [x] Dismiss moves a disposable report to Dismissed while the public prayer remains visible in Expo (maintainer-reported Miriam/Jonah QA flow, 2026-09-24)
- [x] Non-moderator reporter Jonah receives the review outcome in Updates after Miriam dismisses a disposable report, without seeing her distinctive internal decision note (maintainer-reported, 2026-09-26)
- [ ] Review updates never reveal another reporter's identity
- [ ] A failed queue/review load shows retry, not an empty/all-clear state; a failed or conflicting decision requires a fresh review and preserves the draft reason
- [x] Queue offers oldest/newest ordering before pagination; newest pending entries appear above historical reports; desktop and phone-width web layouts verified (2026-09-24, read-only live queue)
- [x] Automated queue tests cover focus/reconnection/30-second refresh, hidden-tab suppression, stale-refresh warnings, request races, and preservation of open review drafts (2026-09-24)
- [x] A new disposable report from Expo appears in the visible Pending / Newest reports queue within 30 seconds without manual refresh (maintainer-reported, 2026-09-24)

## User Blocking (SCRUM-94)

- [x] Disposable local database tests cover bilateral visibility, alias/direct-read
      denial, map/saved/comment/Updates isolation, rejected interactions/invites,
      retained report review and unblock behavior (58 assertions, 2026-09-28).
- [x] Seven two-session database tests cover Block racing with Circle acceptance,
      new invitations, legacy follows and reciprocal blocks; all 45 existing
      moderation assertions still pass (2026-09-28).
- [x] Direct API tests reject anonymous/expired/wrong-account Circle actions and
      direct block-table mutation; own pending-invite cancellation still works.
- [x] Automated native/query tests cover confirmed/cancelled/failed actions,
      duplicate taps, stack reset, own/anonymous exclusions, list errors/pagination,
      Settings entry and Unblock (2026-09-28).
- [x] Migration 041 applied to Oratio_DB with recorded deployment approval; local/remote history
      matches 001-041. Read-only live checks confirm policies, relationship guards,
      restricted RPC/table permissions and anonymous/missing-identity rejection.
      Existing data counts and moderator-role fingerprint are unchanged; no accounts
      were blocked (2026-09-28). Implementation `6b5a710` passed GitHub CI.
- [x] On a physical iPhone, block another QA account from their profile; confirmation,
      success feedback, return to Public prayers and the entry in Settings > Blocked
      accounts work (maintainer-reported, 2026-09-28).
- [x] Profile Block moved behind a neutral three-dot options button; automated
      opening/closing, confirmation handoff, cancellation, retry and identity
      visibility checks pass (2026-10-07; 64 focused native tests and type-check).
- [x] Updated profile options entry point works in Expo (maintainer-reported, 2026-10-07).
- [ ] In the remaining light/dark device pass, verify options-sheet dismissal and
      Block user > Cancel leaves the profile intact; the basic menu success above
      does not independently confirm each case in both themes.
- [x] Named public prayer's three-dot menu > Block user: Cancel keeps the prayer
      accessible; confirming Block shows success and returns to Public prayers with
      that author's prayers hidden (maintainer-reported, 2026-09-29).
- [x] Cancel and Block from another QA user's comment work on iPhone
      (maintainer-reported, 2026-09-29).
- [ ] A failed Block shows clear feedback without claiming success; reconnecting
      allows a deliberate retry on device.
- [x] After switching to the blocked QA account and refreshing Public prayers, the
      blocking account's prayers disappear (maintainer-reported, 2026-09-28).
- [ ] Verify blocking on other surfaces/direct links and that unrelated accounts
      retain their original access.
- [ ] Existing Circle membership and pending invites disappear; new invites and
      interactions fail without changing the other account's data.
- [x] Settings > Blocked accounts > Unblock confirmation removes the entry; after
      refreshing both accounts, public prayers are visible again without automatically
      restoring a Circle connection (maintainer-reported, 2026-09-28).
- [ ] Settings lists only the viewer's blocks; failed Unblock retains the row;
      one-sided Unblock still respects a reciprocal block.
- [ ] New controls remain readable and reachable in light/dark mode on iPhone.

## Service Notices (SCRUM-97)

Use an isolated Netlify preview and Expo's preview notice URL override; do not
broadcast a test message to production users. See
[SERVICE-NOTICES.md](./backlog/SERVICE-NOTICES.md).

- [x] Local API/admin/native regression suites and four mocked desktop/mobile browser journeys pass; no real notices published (2026-09-30).
- [x] Verify Miriam's approved test-only identity, deploy the named test environment, and verify production deployment/non-test environment unchanged; per-deploy storage separation covered by API regression tests (2026-10-06).
- [x] Hosted API rejects missing/invalid tokens and Jonah's management requests; Miriam can manage. Moderator role alone does not bypass the allowlist (2026-10-06).
- [x] Real hosted browser preview/publish/withdraw journeys pass on desktop Chromium/light and phone-width WebKit/dark; no horizontal overflow (2026-10-06).
- [x] Hosted API rejects stale writes, omits admin audit fields publicly, expires a notice and returns empty state after cleanup (2026-10-06).
- [x] Maintainer reported the basic hosted-admin/Expo notice journey worked; this does not establish every signed-in/out, dismissal or offline check below (2026-10-06).
- [x] Optional UTC maintenance window passes editor/API validation and renders locally in preview/native tests; cross-midnight/year, DST offset changes, non-whole-hour zones and offline cache covered. Six mocked browser checks pass with inspected light/dark screenshots (2026-10-07).
- [ ] Publish a notice with maintenance times and verify title, details and local dates/timezone in Expo; change the device timezone and foreground the app to verify conversion, including overnight windows and larger text.
- [ ] Publish on the isolated preview and verify the matching banner in Expo Go signed in and signed out.
- [ ] On iPhone in light/dark and larger text, the banner respects the notch, dismiss target and scrolling; navigation, keyboard and prayer draft remain usable.
- [ ] Dismiss a notice, reopen the app, and confirm it stays dismissed; publish a new revision and confirm it becomes visible.
- [ ] A scheduled notice starts and expires correctly, including with cached data offline; withdrawal is reflected after reconnection/foreground refresh.
- [ ] Network failure does not block the app, clear a valid cache or falsely claim a withdrawal; an uncached device can continue normally.
- [ ] Publishing/withdrawing while composing a prayer preserves the draft and navigation position.
- [ ] A stale admin tab cannot overwrite a newer notice; reload retains the draft. A failed publish reports failure and retains the draft.
- [ ] Withdraw the preview test notice, remove the mobile preview override, and record device/build/deployment evidence before closure.

## Native Runtime

Non-functional acceptance is tracked in [NFR-CHECKLIST.md](./NFR-CHECKLIST.md).
Reuse the dated functional results above without treating them as a full NFR pass.

The [resilience record](./backlog/NATIVE-RESILIENCE.md) tracks the local SCRUM-95
checkpoint; the following checklist separates reported passes from open checks:

- [x] SDK 58 project opens in iOS Expo Go (maintainer-reported, 2026-10-27; local `a3e755a` working tree plus the uncommitted SDK upgrade; exact device/iOS not recorded)
- [x] Private-prayer disconnect/submit/reconnect/retry smoke test passed (maintainer-reported, 2026-10-27). See the [scoped evidence](./backlog/NATIVE-RESILIENCE.md#device-acceptance); committed-write/lost-confirmation fault injection remains open.
- [x] Signing out of Jonah and signing in as Miriam on the same iPhone shows Miriam's profile and only Miriam's Private prayers (maintainer-reported, 2026-10-29; local SDK 58 candidate). See the [scoped evidence](./backlog/NATIVE-RESILIENCE.md#device-acceptance).
- [ ] Offline/slow feed, map/location and prayer-detail loading reach a retryable state; failed reads are not displayed as genuine empty results
- [ ] Failed feed refresh/page loading preserves appropriate rows/cursor with explicit retry; superseded responses cannot replace newer filters/routes
- [ ] Prayer submission retains its draft without false success; an uncertain outcome locks the intent and Check and retry submission confirms only one matching prayer
- [ ] Failed verification of an uncertain submission retains its original ID/intent, including after an authentication/network failure
- [ ] Account change clears navigation, drafts and activity state; delayed old-account responses/token refreshes cannot restore previous-account state
- [ ] On the current candidate, comments/replies/notes, reports and Circle actions retain their original intent after uncertain confirmation; Check and retry confirms one matching result
- [ ] Pray/save retries retain their desired state and use the server prayer total; prayer edits/deletes/renewals do not overwrite concurrent text or restart an active expiry
- [ ] Profile/settings failures retain drafts and lock uncertain changes; retrying a saved photo URL does not reopen the picker/upload
- [ ] Failed comments/Circle/search/profile/settings reads show explicit retry and preserve loaded rows/drafts; genuine empty results remain distinct

- [ ] Attach evidence for Beta NFR-01/02/05/06/08 before external TestFlight distribution
- [ ] Attach evidence for Launch NFR-03/04/07 and revalidate Beta gates on the public release candidate
- [ ] Record device/iOS, build/SHA, conditions, actual results and remaining defects in the owning Jira tickets; `SCRUM-40` records release sign-off

- [ ] Cold launch, warm launch, background/foreground, and force-quit/reopen all work
- [ ] Slow or interrupted internet produces a recoverable state rather than a blank screen
- [ ] Safe-area insets are respected on the target iPhone
- [ ] No private prayer text or credentials appear in logs, Sentry, or analytics
- [ ] Repeat this checklist against a release-mode/TestFlight build before external beta
- [ ] Verify Sentry receives a deliberate release-tagged test error for this build
  - Local opt-in JavaScript reporting and a non-production Settings diagnostic
    are implemented; follow [the monitoring runbook](./backlog/NATIVE-MONITORING.md).
    A controlled Expo Go error reached `oratio-mobile` on 2026-10-20 and the owner
    confirmed the triggered alert email. A follow-up event from committed `c856c52`
    shows filtered geography and no empty-stack processing warning. Full provider
    payload review remains open. Native crash capture remains disabled; signed-build
    privacy/timing verification is still required, so this release gate stays open.
- [ ] Verify PostHog receives approved app-open/auth/prayer/map events without prayer text or personal data

## Visual Parity

- [ ] Every compact top-bar lockup and contextual heading is horizontally centered, independent of its left/right actions
- [ ] The compact ORATIO + Beta lockup is visually consistent on authentication, Public, and Map; contextual screens retain clear titles
- [ ] ORATIO branding and contextual screen headings use Sora; profile identity and interface copy use Inter
- [ ] Public, Circle, Private, and location feeds use the same quiet row rhythm and dividers
- [ ] Public feed filters switch between All, Saved, and a selected Country without losing pull-to-refresh or pagination
- [ ] Public feed search matches prayer text, city, country, and category; clearing search restores the active All/Saved/Country feed
- [ ] Public feed trending hashtags appear from loaded prayers and tapping one runs the corresponding search
- [ ] Header actions and bottom navigation use familiar icons without visible icon labels
- [ ] Back, submit, pray, retry, and password visibility controls have clear 44pt+ targets
- [ ] Prayer detail save/unsave updates the bookmark state and Saved filter after returning to Public
- [ ] Profile headers show public identity only; account email appears under Settings and nowhere on the public-facing profile
- [ ] Long prayers, usernames, and locations wrap or truncate without shifting nearby controls
- [ ] The map remains full-screen, selects hotspots reliably, and never zooms abruptly on selection
- [ ] No screen shows oversized cards, nested panels, clipped copy, or accidental colour changes
