# Oratio v1.0 Backlog

> Organized by priority within each epic.
> ✅ = Completed this session

---

## Epic: User Flows & UX Polish

### ✅ P0 — Completed

| Task | Description |
|------|-------------|
| ✅ Live prayer updates | Submit page dispatches `oratio-prayer-added` event; delete dispatches `oratio-prayer-removed`. Home + Feed listen and update in real time. |
| ✅ Location on submit | City + Country fields added. Country is a dropdown from curated list. Auto-detect via geolocation with toggle between auto/manual. Lat/lng saved when geo available. |
| ✅ Profile Saved section | Stats row + section toggle now navigate to `/profile/saved` (working dedicated page) instead of broken inline empty state. |
| ✅ Hashtag clicks | PrayerDetail hashtag → Feed with `?search=` param. Feed reads URL param and initializes search state from it. |
| ✅ Feed duplicate header | Removed redundant "Prayer Feed" title. Global header + bottom nav handle it. |
| ✅ Back buttons | Added back arrows on Onboarding and Login → `/landing`. |
| ✅ My Prayers → full list | Profile shows first 5 prayers with "View all N prayers →" link to `/profile/submitted`. |
| ✅ Landing page polish | Fixed Android Google icon, added Create Account button, fixed mobile scrolling, more bottom padding. |
| ✅ Auth redirect removed | Layout no longer redirects unauthenticated users to landing. App loads directly at `/`. |

### 🔴 P0 — Fix now

| # | Task | Description | Acceptance Criteria |
|---|------|-------------|---------------------|
| 1 | **Fix double back buttons** | Header auto-shows back + many pages also render their own back button (UserProfile, UserList, PrayerDetail). | Only one back button visible per page. |
| 2 | **Label mock data** | Followers/following counts are fake (generated from hash), bios/locations are hardcoded. Add "(sample)" label or a banner: "Sample data — real data coming with accounts". | Users can distinguish real vs sample data. |
| 3 | **Fix fake email subscription** | Landing + Info page "Subscribe" stores email in localStorage only. User thinks they joined a real mailing list. | Either wire to a real API/webhook, or change CTA text to clarify local-only storage. |
| 4 | **Comment submit spinner** | Submit button greys out with no spinner when `submitting`. If API hangs, zero feedback. | Show inline spinner on button while submitting. |
| 5 | **Hashtags in PrayerRow** | PrayerRow (used in profile pages) renders plain text. FeedCard renders clickable hashtags. Inconsistent. | Import `renderHashtags` and wire `onTagClick` in PrayerRow. |

### 🟡 P1 — Important polish

| # | Task | Description |
|---|------|-------------|
| 6 | **Fix report flow timing** | Confirmation "Thanks for reporting" shows before API call resolves. Move toast to after response. |
| 7 | **Comment character limit** | No maxlength or counter on comment textarea. Add generous limit (2000) with counter. |
| 8 | **Hide Delete on other's comments** | Every comment shows Delete. Check ownership against current profile first. |
| 9 | **Missing fallbacks** | `prayerCount` renders blank if 0/undefined. `city` renders blank if empty. Add `?? 0` / `|| "Unknown location"`. |
| 10 | **Avatar alt text** | All avatar `<img>` tags have `alt=""`. Replace with `alt={username}` for accessibility. |

### 🟢 P2 — Refinement

| # | Task | Description |
|---|------|-------------|
| 11 | Read-more affordance | Truncated text (`line-clamp-2/3`) has no visual indicator it was cut off. Add gradient fade or "..." |
| 12 | Bottom nav tap feedback | Missing `active:scale-95` press effect (inconsistent with rest of app) |
| 13 | Comment count in PrayerRow | FeedCard shows it, PrayerRow doesn't. Make consistent. |
| 14 | Animated new comments | New comments pop in instantly. Add fade/slide animation like rest of app. |
| 15 | Info page unsubscribe | No way to undo "Subscribe". Add "Remove me" link in subscribed state. |
| 16 | Title transitions in Header | Title text swaps instantly on route change. Add crossfade. |
| 17 | Crisis resources phone numbers | All links are websites. Add helpline phone numbers for acute distress. |

---

## Epic: Backend / Supabase Migration

### 🔴 P0 — Prerequisite for production

| # | Task | Description |
|---|------|-------------|
| 1 | **Install Supabase SDK** | `npm install @supabase/supabase-js`. Create client. Wire env vars. |
| 2 | **Implement real auth** | OAuth (Google/GitHub) via Supabase Auth. Replace localStorage profile system. |
| 3 | **Migrate prayer data** | Create `prayer_requests` table. Submit writes to Supabase instead of localStorage. |
| 4 | **Migrate comments** | Create `comments` table. Wire `api.ts` to Supabase CRUD. |
| 5 | **Migrate follows** | Create `follows` table. Wire follow/unfollow to Supabase. |
| 6 | **Migrate reports** | Create `reports` table. Wire report submission + moderation view. |
| 7 | **Real feed** | Replace `mockFeedPrayers` with Supabase query. Remove mock data dependency. |

### 🟡 P1 — Security & reliability

| # | Task | Description |
|---|------|-------------|
| 8 | **Google Translate → Edge Function** | API key is hardcoded in client bundle. Proxy through Supabase Edge Function or Netlify Function. |
| 9 | **Add Error Boundary** | Wrap app in error boundary. Current: any render crash = white screen. |
| 10 | **Real 404 page** | Catch-all route currently redirects silently to `/`. Create proper NotFound page. |

### 🟢 P2 — Monitoring & analytics

| # | Task | Description |
|---|------|-------------|
| 11 | Wire Sentry (`@sentry/react`) | DSN already in env vars. No SDK installed. |
| 12 | Wire PostHog | Key already in env vars. No SDK installed. |

---

## Epic: PWA Polish

### 🟡 P1

| # | Task | Description |
|---|------|-------------|
| 1 | **Maskable PWA icons** | Manifest icons missing `purpose: "maskable any"`. Android shows white square on home screen. |
| 2 | **Offline fallback** | Workbox config missing `navigateFallback`. Navigation while offline shows browser "No Internet" page. |
| 3 | **Apple splash screens** | No `apple-touch-startup-image` tags. White flash on iOS cold start. |

### 🟢 P2

| # | Task | Description |
|---|------|-------------|
| 4 | SW update prompt | Currently `autoUpdate`. Users get no "Update available" notification. |
| 5 | Web Share Target API | Manifest missing `share_target`. Can't share into Oratio from other apps. |
| 6 | CSP / Security headers | Netlify config missing `Content-Security-Policy`, `HSTS` headers. |
| 7 | SVG favicon fallback | No `.ico` fallback for older browsers. |

---

## Notes for JIRA cleanup

- If you see tickets about "Landing page redirect", "Auth gate", "Custom events", "Saved section broken", "Hashtag search" — those are all ✅ done.
- Tickets about "Mock data", "Fake followers", "Double back buttons" — not done, in P0/P1 above.
- Tickets about "Supabase auth", "Database migration", "Backend API" — not started, Epic 2.
- Anything about "Push notifications", "Badging API", "Background sync" — deferred to post-v1.0.
