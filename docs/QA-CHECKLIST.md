# Oratio V1 — QA Checklist

Use this before release and after any deploy touching auth, feed, or prayer flows. Sign-up items require disposable test accounts (E2E credentials in `.env` are used by Playwright for the automated journeys).

## Authentication (email/password only)

**Sign up**
- [ ] Landing page shows "Create Account" and "Sign in"
- [ ] Onboarding creates an account with email + password + username
- [ ] Email verification screen appears when Supabase requires confirmation
- [ ] Profile row auto-created in Supabase

**Sign in / out**
- [ ] Valid credentials sign in and land on the feed
- [ ] Wrong password shows an error; empty fields show a validation message
- [ ] "Forgot password?" → reset email → `/update-password` sets the new password
- [ ] Sign out returns to landing

**Guards**
- [ ] Logged-out users hitting `/`, `/feed`, `/submit`, `/profile*`, `/updates`, `/moderate` are redirected
- [ ] Shared prayer links prompt sign-in, then return to the prayer

## Feed & Map

- [ ] Feed loads recent public prayers (pagination on scroll)
- [ ] Search filters prayers; recent searches appear and are removable
- [ ] Location filter (country pill + map hotspot) filters correctly
- [ ] Saved filter shows saved prayers; "Prayer Circle" filter shows circle-only prayers or the empty invite state
- [ ] Map shows hotspots; tapping a hotspot opens the location-filtered feed
- [ ] Unknown locations never appear as map hotspots

## Submit

- [ ] Text required (10–500 chars); validation messages shown
- [ ] Location (city/country) required
- [ ] Anonymous toggle hides attribution on the feed
- [ ] Audience: public / Prayer Circle / private — private prayers only in the owner's private list
- [ ] Success screen offers "View in Feed"; new prayer appears at the top of the feed

## Prayer Detail

- [ ] "Pray for this" toggles to "Prayed for this" and increments the count
- [ ] Comments: add, reply, edit, delete, report all work
- [ ] Author can turn comments off/on (public prayers)
- [ ] Translation appears for non-native text and can be reverted
- [ ] Share copies a link (or opens the native share sheet)
- [ ] Report flow shows confirmation; duplicate reports are blocked
- [ ] Author can edit their prayer text; "Edited" label shows

## Prayer Circle

- [ ] Invite by username; recipient sees and accepts/declines
- [ ] Connected members see each other's circle-only prayers
- [ ] Circle capacity limit respected

## Profile & Settings

- [ ] Stats (public/circle/private, prayed for, saved) are accurate
- [ ] Edit profile: username (lowercased), display name, bio, location save correctly
- [ ] Username change keeps old profile links working
- [ ] Avatar upload works, including iPhone HEIC photos
- [ ] Theme (light/dark/system) persists and stays readable

## Updates & Moderation

- [ ] Updates inbox lists events; unread badge counts and clears
- [ ] Delete an update removes it
- [ ] Non-moderators see "Moderator access required" at `/moderate`
- [ ] Moderators can resolve/dismiss reports; audit trail visible

## PWA / Mobile

- [ ] Installable from mobile Safari/Chrome; standalone launch works
- [ ] After a deploy, the app refreshes to the new version (service worker update)
- [ ] Offline app shell renders (landing at minimum)
- [ ] Safe-area insets respected on iPhone (notch) in light and dark mode
