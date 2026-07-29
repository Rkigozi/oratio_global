# Oratio v1.0 — Manual QA Walkthrough

> Estimated time: 20-30 min
> Test on: **Chrome desktop** + **Safari/Chrome mobile** (iPhone/Android)

---

## 1. Auth Flow

### 1.1 Landing Page

- [ ] Open the app → see landing page with ORATIO branding, features, waitlist
- [ ] "Create Account" button → navigates to `/onboarding`
- [ ] "Sign in" link → navigates to `/login`

### 1.2 Sign Up (Email)

- [ ] On `/onboarding`, enter email + password + username → tap "Create Account"
- [ ] If email confirmation required → see verification screen with "Didn't get it?" resend
- [ ] If no confirmation → lands on `/` (Home/Feed)
- [ ] Check Supabase `profiles` table → row auto-created with username

### 1.3 Sign In

- [ ] On `/login`, enter email + password → tap "Sign In" → lands on `/feed`
- [ ] Wrong password → error message shown
- [ ] Unregistered email → error message shown
- [ ] "Forgot password?" → navigates to `/reset-password`

### 1.4 Google OAuth

- [ ] On `/onboarding` or `/login`, tap "Continue with Google"
- [ ] Google popup appears → authenticate
- [ ] Redirected back to app → signed in
- [ ] Sign out from Profile → lands on Landing page

### 1.5 Password Reset

- [ ] `/reset-password` → enter email → "Check your email" confirmation
- [ ] Click reset link → lands on `/update-password`
- [ ] Enter new password + confirm → redirects to `/feed`

---

## 2. Prayer Feed

- [ ] Feed loads prayers from Supabase (not blank)
- [ ] Each card shows: avatar, username, prayer text, location, time ago, pray count
- [ ] **Infinite scroll** — scroll to bottom, more prayers load automatically
- [ ] **Filter pills** work: All | Near Me | Prayer Circle | Saved | Country
- [ ] **Prayer Circle** shows only prayers intentionally shared to Prayer Circle
- [ ] **Search** — type a keyword, hashtag, city, or country → feed filters
- [ ] **Recent searches** — previously searched terms shown as quick taps
- [ ] **Trending hashtags** — scrollable row above feed
- [ ] **Hashtag click** → feed filters by that tag
- [ ] Tap a prayer card → navigates to `/prayer/:id`

---

## 3. Submit Prayer

- [ ] Choose **Public** → prayer appears in the public feed/map
- [ ] Choose **Prayer Circle** → prayer appears in Circle Prayers and stays out of the public map

- [ ] Tap Submit tab in bottom nav → `/submit`
- [ ] Type prayer text (10-500 chars) → character counter visible
- [ ] **Location** — toggle auto/manual; auto tries geolocation, manual lets you type
- [ ] Country dropdown → populated curated list
- [ ] **Anonymous toggle** — hides your name from the prayer
- [ ] **Comments toggle** — allow/disallow comments
- [ ] Tap "Share" → prayer saved, success screen with share button
- [ ] New prayer appears in Feed immediately (custom event)
- [ ] New prayer appears on Profile → Submitted
- [ ] Prayer appears on map (Home) as hotspot

---

## 4. Prayer Detail

- [ ] Tap a prayer → `/prayer/:id` shows full text, location, time, attribution
- [ ] **Pray button** — tap to pray → count increments, button changes to "Prayed for this"
- [ ] Tap again → unprays, count decrements
- [ ] **Save bookmark** — from menu → icon fills, prayer appears in Profile → Saved
- [ ] **Share** — from menu → native share sheet (mobile) or clipboard copy (desktop)
- [ ] **Translate** — if prayer is in another language, "Translate" option in menu
- [ ] **Prayer Circle invite** — tap Invite on author → button changes to "Invite sent"
- [ ] If the author has invited you first, tap Accept → state changes to "In Circle"
- [ ] **Report** — from menu → select reason → "Reported" confirmation

---

## 5. Comments

- [ ] Comments section visible below prayer on detail page
- [ ] Type a comment → tap Send → appears immediately with your avatar
- [ ] **Reply** — tap reply on a comment → textarea shows "Write a reply..."
- [ ] **Character counter** — `{n}/2000` below textarea
- [ ] **Delete** — your own comments show Delete; prayer authors can Remove comments on their own prayer
- [ ] **Report** — comments you cannot delete show report option
- [ ] Comments count updates in feed card after adding

---

## 6. Profile

- [ ] Tap Profile tab → shows your avatar, display name, username, bio, location
- [ ] Stats row: Prayers | Prayed | Prayer Circle
- [ ] Tap Prayer Circle → `/profile/circle` shows incoming invites, outgoing invites, and accepted people
- [ ] **Edit profile** — tap edit → change photo, display name, bio, location
- [ ] **Submitted prayers** — shows first 5 with "View all N →" link
- [ ] **Section toggle** — Submitted / Prayed For / Saved — each shows correct list
- [ ] Tap a prayer in your list → detail drawer opens from bottom
- [ ] **Delete a prayer** → confirmation drawer → removed from feed + map
- [ ] **Settings** → theme toggle (dark/light), notifications, language, account deletion

---

## 7. User Profile (Other)

- [ ] Tap a username anywhere → `/user/:name` shows their profile
- [ ] Stats: prayers count and mutual Prayer Circle context
- [ ] Prayer Circle button works: Invite, Invite sent/cancel, Accept, Decline, In Prayer Circle
- [ ] List of their prayers — tap one → `/prayer/:id`
- [ ] No public follower/following counts or lists are shown

---

## 8. Map (Home)

- [ ] Home tab shows world map with prayer hotspots
- [ ] Map shows circles/heat based on prayer activity
- [ ] Zoom in/out works
- [ ] Bottom drawer shows city prayer activity
- [ ] "View Prayers" → navigates to Feed with city filter
- [ ] No "Unknown, Unknown" hotspot appears on the map

---

## 9. Settings & Info

- [ ] **Theme toggle** — dark ↔ light mode, persists on reload
- [ ] **Notification preferences** — toggle notify_on_prayed, notify_on_comment
- [ ] **Language** — select preferred language
- [ ] **Default comments** — on/off for new prayers
- [ ] **Delete account** → confirmation → deletes from Supabase
- [ ] **Info page** → roadmap, status badges, waitlist signup + remove

---

## 10. Edge Cases

- [ ] **Empty states** — Feed with no prayers shows empty message
- [ ] **No location** — prayers without location can show "Unknown" in non-map views, but do not create map hotspots
- [ ] **Rapid tap** — tapping Pray repeatedly doesn't double-count
- [ ] **Offline** — service worker serves app shell
- [ ] **404** — navigate to `/nonexistent` → 404 page with "Go home" button
- [ ] **Back navigation** — browser back, mobile back gesture all work
- [ ] **Long prayer text** — 500 chars truncates correctly with line-clamp
- [ ] **Comments off** — prayer with comments disabled shows "Comments are disabled"

---

## 11. PWA

- [ ] Install prompt appears (after criteria met)
- [ ] App launches standalone (no browser chrome)
- [ ] Icons render correctly on home screen
- [ ] Splash screen shows on cold start (iOS)
- [ ] Update prompt appears when new version deployed

---

## 12. Monitoring Verification

- [ ] Open browser console → no uncaught errors
- [ ] Trigger an error → check **Sentry** at https://sentry.io/organizations/oratio-3j/issues/
- [ ] Perform a few actions → check **PostHog** at https://eu.posthog.com/project/ → Events tab
