# Oratio v1.0 Backlog

> Organized by priority within each epic.
> Last audited: June 15, 2026

---

## Epic: User Flows & UX Polish

### ✅ P0 — Completed

| Task | Status | Notes |
|------|--------|-------|
| Live prayer updates | ✅ Done | CustomEvent dispatch + listen in Feed + Home |
| Location on submit | ✅ Done | City + Country dropdown, geo auto-detect toggle |
| Profile Saved section | ✅ Done | Stats + section toggle → `/profile/saved` |
| Hashtag clicks | ✅ Done | PrayerDetail hashtag → Feed with `?search=` |
| Feed duplicate header | ✅ Done | Redundant title removed |
| Back buttons (Onboarding/Login) | ✅ Done | ArrowLeft → `/landing` on both |
| My Prayers → full list | ✅ Done | Profile shows 5 + "View all N →" |
| Landing page polish | ✅ Done | Google icon SVG, Create Account, scroll/padding |
| Auth redirect removed | ✅ Done | Layout no longer gates unauthenticated users |
| Fake email subscription | ✅ Done | Now wired to Supabase `waitlist` table |

### 🔴 P0 — Fix now

| # | Task | Description | Status |
|---|------|-------------|--------|
| 1 | ~~Fix double back buttons~~ | PrayerDetail/UserProfile/UserList are standalone routes (not in Layout) — their back buttons are correct | ✅ Not an issue |
| 2 | **Label mock data** | Followers/following counts still fake/hardcoded without "(sample)" label | ⚠️ Partial — prayers labeled, followers count not |
| 3 | **Comment submit spinner** | Greys out with no feedback if API hangs | ✅ Fixed — spinner implemented |
| 4 | **Hashtags in PrayerRow** | Was plain text, inconsistent with FeedCard | ✅ Fixed — `renderHashtags` wired |
| 5 | **Stale text on Landing** | Says "We'll save your interest locally" but subscription now hits Supabase | ✅ Fixed |
| 6 | **Google Translate API key in client bundle** | `VITE_GOOGLE_TRANSLATE_API_KEY` in `.env` gets inlined into built JS | ✅ Fixed — removed from `.env` |

### 🟡 P1 — Important polish

| # | Task | Description | Status |
|---|------|-------------|--------|
| 6 | **Fix report flow timing** | PrayerDetail shows confirmation before API resolves | ✅ Fixed |
| 7 | **Comment character counter** | `maxLength` exists (2000) but no visible counter | ⚠️ Partial — needs `{length}/2000` display |
| 8 | **Hide Delete on other's comments** | Check ownership against current profile | ✅ Done |
| 9 | **Missing fallbacks** | `prayerCount` blank if 0/undefined in profile pages; `city` blank in PrayerDetail/profile pages | ⚠️ Partial — some done, several missing |
| 10 | **Avatar alt text** | All avatars use descriptive alt (e.g. `alt={username}`) instead of `alt=""` | ✅ Done (descriptive is actually better for a11y) |

### 🟢 P2 — Refinement

| # | Task | Description | Status |
|---|------|-------------|--------|
| 11 | Read-more affordance | `line-clamp-2/3` has no visual indicator of truncation | ❌ Not done |
| 12 | Bottom nav tap feedback | Missing `active:scale-95` press effect | ❌ Not done |
| 13 | Comment count in PrayerRow | FeedCard shows it, PrayerRow doesn't | ❌ Not done |
| 14 | Animated new comments | No fade/slide animation on new comments | ❌ Not done |
| 15 | Info page unsubscribe | "Remove" clears local state but not DB row | ⚠️ Partial — no DELETE API call |
| 16 | Title transitions in Header | Title swaps instantly with no crossfade | ❌ Not done |
| 17 | Crisis resources phone numbers | All links are websites, no `tel:` numbers | ❌ Not done |
| 18 | Apple splash screens | No `apple-touch-startup-image` tags in `index.html` | ❌ Not done |
| 19 | Web Share Target API | Manifest missing `share_target` field | ❌ Not done |
| 20 | CSP security headers | `netlify.toml` missing `Content-Security-Policy` | ❌ Not done |
| 21 | `.ico` favicon fallback | PNG fallback exists, no `favicon.ico` for old browsers | ⚠️ Partial — has PNG, no ICO |

---

## Epic: Backend / Supabase Migration

> **Note:** Most Supabase migration work is already complete. Remaining items are cleanup/security/monitoring.

### ✅ Completed

| # | Task | Notes |
|---|------|-------|
| 1 | Supabase SDK | `@supabase/supabase-js` installed, client created, env vars wired |
| 2 | Real auth | Email/password + Google OAuth via Supabase Auth |
| 3 | Prayer data | `prayer_requests` table — Supabase CRUD with localStorage dual-write fallback |
| 4 | Comments | `comments` table — Supabase CRUD, no localStorage |
| 5 | Follows | `follows` table — Supabase CRUD, minor localStorage relic |
| 6 | Reports | `reports` table — Supabase INSERT with localStorage fallback |
| 7 | Real feed | Supabase-powered; `mockFeedPrayers`/`mockHotspots` are dead code |
| 8 | Google Translate proxy | Edge function proxies to Google Translate — no key in client bundle |
| 9 | Error Boundary | Class-based ErrorBoundary wrapping root app |
| 10 | Real 404 page | Catch-all route → `NotFound` component |

### 🔴 P0 — Still needed

| # | Task | Description |
|---|------|-------------|
| 11 | **Remove localStorage dual-writes** | Prayer creation/follow/report still dual-write to localStorage. Clean up. |
| 12 | **Remove dead mock data** | `mockHotspots` and `mockFeedPrayers` in `prayer-data.ts` are unused |
| 13 | **Deprecate localStorage profile system** | `profile-data.ts` (229 lines) coexists alongside Supabase Auth |

### 🟡 P1 — Monitoring & analytics

| # | Task | Description | Status |
|---|------|-------------|--------|
| 14 | **Wire Sentry** | `@sentry/react` + `@sentry/browser` installed, `Sentry.init()` called — **DSN missing from `.env`** | ❌ Not configured |
| 15 | **Wire PostHog** | `posthog-js` installed, `posthog.init()` called — **API key missing from `.env`** | ❌ Not configured |

---

## Epic: PWA Polish

### ✅ Completed

| # | Task | Notes |
|---|------|-------|
| 1 | Maskable PWA icons | `purpose: "maskable any"` on 192+512 PNG icons in manifest |
| 2 | Offline fallback | `navigateFallback: '/index.html'` configured in workbox |
| 3 | SW update prompt | `registerType: 'prompt'` + React `UpdatePrompt` component with Update/Dismiss UI |
| 4 | HSTS header | `Strict-Transport-Security` present in `netlify.toml` |

### ❌ Not done

| # | Task | Notes |
|---|------|-------|
| 5 | Apple splash screens | No `apple-touch-startup-image` tags in `index.html` |
| 6 | Web Share Target API | No `share_target` in manifest |
| 7 | CSP security headers | `Content-Security-Policy` absent from `netlify.toml` |
| 8 | `.ico` favicon fallback | Has PNG 32x32 fallback but no `favicon.ico` |

---

## Quick Wins — Remaining

1. **Add monitored env vars** — Ask Robert for `VITE_SENTRY_DSN` and `VITE_POSTHOG_KEY` values, add to `.env`
2. **Add comment char counter** — Show `{newComment.length}/2000` below comment textarea in `comment-section.tsx`
3. **Add missing fallbacks** — `prayerCount ?? 0` in profile pages, `city || "Unknown"` in PrayerDetail + profile pages
4. **Add `.ico` favicon** — Create `public/icons/favicon.ico` for old browsers
