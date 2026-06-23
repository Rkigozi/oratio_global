# Oratio v1.0 — QA Checklist

## Authentication

### Sign Up
- [ ] Landing page loads with "Start Praying" and "I already have an account" buttons
- [ ] Tap "Start Praying" → Onboarding page shows Google + Email options
- [ ] Google sign-up redirects to Google, comes back to `/`
- [ ] Email sign-up creates account and navigates to `/`
- [ ] Profile is auto-created (check Supabase `profiles` table)
- [ ] Signscreen shows onboarding only for first-time users

### Sign In
- [ ] Tap "I already have an account" → Login page shows email + password + Google
- [ ] Email sign-in works with correct credentials
- [ ] Google sign-in works
- [ ] Wrong password shows error message
- [ ] Sign-in with unregistered email shows error

### Sign Out
- [ ] Profile page → "Sign Out" → redirects to landing page
- [ ] After sign-out, navigating to `/` redirects to landing

---

## Feed

### Core
- [ ] Feed loads with 20 prayers initially
- [ ] Scrolling loads more (infinite scroll)
- [ ] Prayer cards show: avatar, username, text, comment button, pray button
- [ ] City/location is NOT shown on feed cards
- [ ] Trending hashtags row appears at top
- [ ] Each prayer shows correct time ago

### Search
- [ ] Search bar is present
- [ ] Type query → press Enter → prayers filtered
- [ ] Tap a trending hashtag → feed filtered by that hashtag
- [ ] Recent searches appear on focus
- [ ] Hover recent search → X shows → tap to delete
- [ ] Clear search with X button
- [ ] Search banner shows active search

### Filters
- [ ] "All" filter pill resets all filters
- [ ] "Near Me" filters by geolocation country (if allowed)
- [ ] "Saved" filter shows only saved prayers
- [ ] "Country" dropdown opens country list
- [ ] Selecting a country filters prayers
- [ ] Filter banner shows when location filter is active

### Pray Interaction
- [ ] Tap 🙏 button → count increments, state toggles to "Prayed"
- [ ] Tap again → count decrements, toggles back to "Pray"
- [ ] Count persists on page reload (localStorage)

### Comments
- [ ] Tap "Comment" button → navigates to prayer detail page
- [ ] Comment section loads below prayer
- [ ] Type comment → press Enter → comment appears
- [ ] Reply to a comment → reply appears under parent
- [ ] "View X replies" shows for 2+ replies
- [ ] Delete comment → comment removed, counter updates
- [ ] Report comment → shows "Thanks for reporting"

### Save
- [ ] Tap prayer → detail page → ⋯ → "Save" → returns to feed → "Saved" filter shows it
- [ ] Tap "Saved" again → unsaves

---

## Prayer Detail Page

- [ ] Opens with correct prayer text
- [ ] "Back" returns to previous page
- [ ] Share via ⋯ → native share sheet or clipboard
- [ ] Report via ⋯ → reason picker → "Thanks" message
- [ ] Translate via ⋯ → translates Spanish/French/German prayers to English
- [ ] 🙏 button toggles pray state
- [ ] Comment section loads existing comments
- [ ] Comment input works

---

## Submit Prayer

- [ ] Submit page has text area + anonymous toggle
- [ ] Placeholder hints at #hashtags
- [ ] Text shorter than 10 characters → error
- [ ] Text longer than 500 → counter turns red
- [ ] Anonymous toggle changes display text
- [ ] Submit → shows success screen
- [ ] "View in Feed" navigates to feed
- [ ] "Share prayer link" generates URL to /prayer/:id
- [ ] "Submit Another Request" resets form

---

## Map (Home)

- [ ] Map loads with ESRI Light Gray tiles
- [ ] Country borders visible
- [ ] Gold circle markers appear on cities
- [ ] Tap marker → drawer opens with city info
- [ ] "View Prayers" navigates to feed filtered by city
- [ ] Geolocation prompt appears on first visit
- [ ] "Allow" → flies to your location
- [ ] Locate button (crosshair) appears bottom-right when location known
- [ ] Tap locate → flies back to location
- [ ] "Tap a location to pray" hint fades on first visit

---

## Profile

- [ ] Avatar shows initial letter
- [ ] "Change Photo" uploads image
- [ ] Username shows with @
- [ ] Stats show: Submitted, Prayed For, Saved counts
- [ ] Tapping a stat navigates to detail page
- [ ] "Info" shows info page with install guide
- [ ] "Sign Out" signs out
- [ ] Edit drawer: change display name
- [ ] Edit drawer: change username

---

## Info Page

- [ ] Prototype notice visible
- [ ] Install Oratio guide shows iOS or Android steps
- [ ] Roadmap shows upcoming features
- [ ] Changelog shows version history

---

## Translation

- [ ] Spanish prayers appear in feed (mixed with English)
- [ ] Open Spanish prayer → ⋯ → "Translate" → English translation appears
- [ ] "Translated from Spanish" text appears below
- [ ] Tap "Translate" again → "Original" → returns to Spanish
- [ ] French, Portuguese, German, Italian prayers also translate

---

## PWA

- [ ] Manifest.webmanifest is served
- [ ] Service worker is registered (check Application → Service Workers)
- [ ] App can be added to home screen on mobile
- [ ] Install guide in Info page shows correctly for iOS vs Android

---

## Edge Cases

- [ ] Rapidly tap 🙏 multiple times → no double-count
- [ ] Submit with empty text → disabled button
- [ ] Delete all comments → counter shows 0
- [ ] Empty search → shows all prayers
- [ ] Country filter with no matches → "No prayers found"
- [ ] Saved filter with no saved prayers → "No saved prayers yet"
- [ ] Back-to-back translation toggles work
- [ ] Comment while offline → fallback localStorage
- [ ] Report same prayer twice → only shows "Reported"

---

## Performance

- [ ] Cold load < 3s on mobile 3G
- [ ] Feed scrolls smoothly at 60fps
- [ ] Search response is instant (< 100ms)
- [ ] Map zoom/pan is smooth
- [ ] No console errors in production build

---

## Responsive

- [ ] iPhone SE (375px) — all pages fit
- [ ] iPhone 14 Pro (390px) — all pages fit
- [ ] Desktop (1280px) — max-width content, centered
- [ ] Landscape orientation — no broken layouts
- [ ] Bottom nav visible on all main pages

---

## Test Results

**Run:** `npm test`
**Expected:** 50 tests passing
**Current:** _____ passing

**QA Sign-off:** ____________________
**Date:** ____________________
**Notes:** ____________________
