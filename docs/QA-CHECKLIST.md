# Oratio Native V1 — QA Checklist

Use this on a physical iPhone in Expo Go after native changes. Repeat the critical set in TestFlight once EAS distribution is introduced. Web/PWA regression checks remain separate during the migration.

## Before You Start

- [ ] Test the latest `main` commit with no local changes affecting the build
- [ ] Apply all Supabase migrations through `038_canonical_prayer_locations.sql`
- [ ] Prepare three verified test accounts with distinct usernames, profiles, and avatars
- [ ] Account A is new or intentionally empty; Account B owns representative public, Circle, and private prayers; Account C is an accepted Circle peer
- [ ] Keep Account B signed in on the physical iPhone and Accounts A/C in separate browser or device sessions
- [ ] Confirm all sessions reach the same Supabase project before testing Circle, privacy, comments, and Updates
- [ ] Record the latest TestFlight version/build and Git commit used for the pass

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
- [ ] Empty states clearly describe each space
- [ ] Pull-to-refresh works in all three spaces
- [ ] Bottom-tab icons have stable 44pt+ targets and respect the iPhone safe area across Public / Map / Circle / Private / Me

## Submit

- [ ] Text required (10–500 chars); validation messages shown
- [ ] Blank location is stored as unknown and never becomes a random map point
- [ ] Anonymous is offered only for Public and hides attribution there
- [ ] "Let people encourage me" controls comments for Public prayers only
- [ ] Audience: public / Prayer Circle / private — private prayers only in the owner's private list
- [ ] Success screen opens the submitted prayer; it then appears in the correct space

## Global Map

- [ ] Map tab opens a full-screen world map without a blank or crashed native view
- [ ] Only public prayers with valid locations appear as hotspots
- [ ] Selecting a hotspot shows the correct prayer-request and people-prayed totals
- [ ] "View [location] prayers" opens only public prayers from that location
- [ ] London-area names such as Greater London appear together as London
- [ ] The bottom-right "Go to my location" control requests foreground access only when tapped, recentres in one tap, leaves pan/zoom and hotspots responsive, and never changes a prayer's stored location
- [ ] Denied or unavailable location access shows clear guidance without blocking the map
- [ ] Pull down on a location prayer list refreshes it; map refresh remains responsive
- [ ] Slow or interrupted internet shows a retryable state instead of blocking navigation

## Prayer Detail

- [ ] "Pray for this" toggles to "Prayed for this" and increments the count
- [ ] Opening an unavailable/deleted prayer shows a calm unavailable state
- [ ] Back returns to the previous native screen
- [ ] Public and Circle prayers show comments; a comment can be added and edited
- [ ] Replying to a comment or reply creates a single-level threaded reply
- [ ] A user can delete their own comment; the prayer author can remove another user's comment
- [ ] A Public prayer author can turn comments off and on from prayer detail
- [ ] A private prayer shows personal Notes, not social comment/reply language
- [ ] Private notes can be added, edited, and deleted and are never visible to another user
- [ ] An owner can edit a valid 10-500 character prayer; invalid edits stay open with clear guidance and successful edits show as Edited
- [ ] Deleting an owned prayer requires explicit confirmation, closes detail only after success, and removes it from its feed, Profile count, and map aggregates
- [ ] A non-owner never sees Edit or Delete, including when opening a shared link directly
- [ ] Public and Circle Share opens the native iOS share sheet with safe attribution and the authenticated web prayer link, without copying prayer text or location
- [ ] The shared web prayer link returns to the same prayer after sign-in; inaccessible Circle prayers remain protected by Supabase policy
- [ ] Private prayers do not offer Share
- [ ] Translation and reporting are retested when their native stories land

## Prayer Circle

- [ ] Connected members see explicitly shared circle-only prayers
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
- [ ] Editing username/display name/bio/location saves through Supabase and refreshes the app identity immediately
- [ ] Username continuity works after a username change; old web profile links still resolve through aliases
- [ ] Avatar upload requests photo access, crops square, stores in Supabase Storage, and refreshes Profile
- [ ] Settings toggles in-app Updates for prayers offered, comments/replies, and default comments on public prayers
- [ ] Translation language preference saves and survives reopening Settings
- [ ] Light, dark, and system themes apply across every native tab and persist across relaunch
- [ ] Switching the device appearance while System is selected updates the app without unreadable or incomplete screens
- [ ] Account deletion is available in-app with clear confirmation and recovery guidance for failures
- [ ] Privacy, terms, and support links open the production destinations from Settings
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
- [ ] Prayer and comment menus allow eligible users to choose a report reason and submit it
- [ ] Success, duplicate-report, authentication, and network-error states are clear
- [ ] Reports reach the moderation queue without changing private or Circle visibility

## Native Runtime

- [ ] Cold launch, warm launch, background/foreground, and force-quit/reopen all work
- [ ] Slow or interrupted internet produces a recoverable state rather than a blank screen
- [ ] Safe-area insets are respected on the target iPhone
- [ ] No private prayer text or credentials appear in logs, Sentry, or analytics
- [ ] Repeat this checklist against a release-mode/TestFlight build before external beta
- [ ] Verify Sentry receives a deliberate release-tagged test error for this build
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
