# Oratio v1.0 Backlog

> Production-ready status. Last updated: June 22, 2026

---

## ✅ v1.0 Launch Checklist

### Core Product
- [x] Landing page with sign up / sign in
- [x] Email + Google OAuth authentication
- [x] Prayer submission with location (manual + geo-detect)
- [x] Global feed with infinite scroll (cursor-based pagination)
- [x] "I Prayed" toggle on prayers
- [x] Comments with threaded replies (one level)
- [x] Comment pagination (20 per page, Load More)
- [x] Live comment count on feed cards (DB trigger)
- [x] Search prayers by text, location
- [x] Hashtag system (clickable, trending)
- [x] Save/bookmark prayers (cross-device via Supabase)
- [x] Follow/unfollow users
- [x] Following feed filter (shows prayers from people you follow)
- [x] Profile page with stats: Prayers, Prayed, Following, Followers
- [x] Other user profiles with their prayers
- [x] Prayer detail page with share, report, toggle comments
- [x] Map view with prayer hotspots (light + dark mode)

### Technical & Security
- [x] Supabase backend with full RLS policies
- [x] Auto-profile creation on signup (DB trigger)
- [x] CSP security headers (`netlify.toml`)
- [x] Rate limiting (10 prayers/hr, 30 comments/hr via RLS)
- [x] Sentry error monitoring (DSN active, `logError()` utility)
- [x] PostHog analytics (events: signup, pray, comment, search)
- [x] Avatar upload via Supabase Storage (not base64 blobs)
- [x] Ownership checks at app level (delete prayer/comment)
- [x] Self-follow prevented (`followUser` + UI)
- [x] Self-report prevented (hide report button on own content)
- [x] CI pipeline (type-check, lint, test, build)
- [x] Playwright E2E smoke tests
- [x] PWA with service worker (Workbox, precache)
- [x] HSTS + security headers
- [x] 404 page
- [x] Error Boundary wrapping app root

### Cleanup
- [x] Categories removed (hashtags are the replacement)
- [x] All mock data removed from production code paths
- [x] Sample badges removed from components
- [x] localStorage dead code removed (`oratio_profile`, `oratio_comments_*`, `oratio_last_prayer_location`)
- [x] Info page no longer mentions "sample data"
- [x] `.ico` favicon present
- [x] iOS white flash fix (background color in index.html)
- [x] Service worker registration errors caught (no unhandled rejections)
- [x] Moderation page works (reports UPDATE RLS policy added)

### UI/UX Polish
- [x] Dark mode with system preference sync
- [x] Light mode map tiles (ArcGIS, CSP-allowed)
- [x] Prayer detail shows real avatar from DB
- [x] Feed cards show real avatar from DB
- [x] Comments show `@username` first (like Instagram/Reddit)
- [x] Replies show delete button for own replies
- [x] Comment input gated behind auth ("Sign in to comment")
- [x] Comment char limit aligned with DB (500)
- [x] Submit error doesn't clear textarea
- [x] Double-submit guard on comments (useRef)

---

## 📋 Pre-Launch Items (no domain needed)

| # | Task | Why |
|---|------|-----|
| 1 | Check `/privacy` and `/terms` pages have real content | Legal requirement |
| 2 | Test password reset flow end-to-end | Standard Supabase flow, quick to verify |
| 3 | Test full signup → confirm email → submit → comment → follow | Catch any RLS/auth state issues |
| 4 | Update OG image URL to production domain in `index.html` | Once domain is purchased |

## 🔜 v1.1 Candidates

| # | Task | Why |
|---|------|-----|
| 1 | Email/push notifications | User retention |
| 2 | Admin moderation dashboard | Currently manual Supabase |
| 3 | Apple splash screens | iOS PWA polish |
| 4 | Web Share Target API | Share from other apps |
| 5 | Read-more affordance for truncated text | UX clarity |
| 6 | Bottom nav tap feedback (`active:scale-95`) | Micro-interaction |
| 7 | Animated new comments | UX delight |
| 8 | Title transitions in Header | Route change smoothness |
| 9 | Crisis resources phone numbers (`tel:` links) | Accessibility |
| 10 | Info page unsubscribe (DELETE API) | Waitlist management |
