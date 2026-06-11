# Oratio JIRA Backlog — Epics, Versions & Stories

> **Note:** JIRA API token expired (401). This doc is the local source of truth. Update JIRA manually once token is refreshed.

---

## Fix Versions (Timeline / Phases)

| Version | Name | Status | Dates |
|---------|------|--------|-------|
| v0.1 | Initial Beta | Deployed | Apr 20 → May 11 |
| v0.2 | Feedback Iteration | Deployed | May 11 → Jun 6 |
| v0.3 | v1.0 Foundation | In Progress | Jun 16 → Jul 14 |
| v1.0 | Public Release | Planned | Jul 14 → Aug 11 |

### v0.1 — Initial Beta
Deploy prototype with mock data to validate concept and surface critical issues.
**Status:** Deployed

### v0.2 — Feedback Iteration
Address P1 and P2 feedback from initial user testing. Bug fixes, UX improvements, and high-priority enhancements before wider testing.
**Status:** Deployed

### v0.3 — v1.0 Foundation
Backend, auth, PWA, comments, search, categories, translation, visual polish. Building toward v1.0 public release.
**Status:** In Progress (Jun 16–Jul 14)

### v1.0 — Public Release
CI/CD, monitoring, analytics, testing, accessibility, launch collateral. Everything needed to ship to St Paul's congregation and beyond.
**Status:** Planned (Jul 14–Aug 11)

---

## Epics

### Epic 1: Foundation — Backend & Data Layer
**Goal:** Replace mock data with a real backend so user data persists across sessions and devices.
**Covers:** Supabase setup, database schema (users, prayers, interactions, comments, reports), REST API layer, authentication, real-time updates, data migration from localStorage.
**Sprint:** A (Jun 16–30)

---

### Epic 2: Core Prayer Loop v2
**Goal:** Polish the submit → feed → pray → comment flow so it's fast, reliable, and emotionally connected.
**Covers:** Comments (Reddit-style), comment notifications, push notifications infrastructure, comment moderation, performance optimization, contrast/readability fix, search, category redesign, save button UX, shareable link.
**Sprint:** B + C (Jun 30–Jul 28)

---

### Epic 3: PWA & App Experience
**Goal:** Deliver a fast, installable mobile experience that feels like a real app.
**Covers:** PWA manifest, service worker, offline support, install prompt, push notifications.
**Sprint:** A + B + C (Jun 16–Jul 28)

---

### Epic 4: Discovery & Translation
**Goal:** Let users find prayers that matter to them, in their language.
**Covers:** Search bar, category redesign (tags/sub-categories), map visual refresh, translation.
**Sprint:** C (Jul 14–28)

---

### Epic 5: Safety & Moderation
**Goal:** Keep Oratio a safe, respectful space with clear guardrails against harmful content.
**Covers:** Comment moderation (report, admin delete), crisis resources (already built), report button (already built).
**Sprint:** B (Jun 30–Jul 14)

---

### Epic 6: Launch Readiness
**Goal:** The mechanical work to actually ship v1.0 and know how it's performing.
**Covers:** CI/CD pipeline, Sentry error monitoring, PostHog analytics, critical path tests, accessibility audit, landing page clarity, church launch collateral.
**Sprint:** D (Jul 28–Aug 11)

---

### Epic 7: Testing & Quality
**Goal:** Ship with confidence by catching regressions before they reach users.
**Covers:** Jest + RTL setup, critical path tests (submit, pray, comment, feed), a11y audit, cross-browser testing, QA checklist.
**Sprint:** D (Jul 28–Aug 11)

---

## Sprint Plan — v0.3 → v1.0

### Sprint A: Foundation (Jun 16–30)

| ID | Story | Epic | Priority |
|----|-------|------|----------|
| F-001 | Set up Supabase project and database schema (users, prayers, interactions, comments, reports) | Backend | P0 |
| F-002 | Create REST API for prayer CRUD with pagination and filtering | Backend | P0 |
| F-003 | Implement authentication (email, Google OAuth, anonymous, session persistence) | Backend | P0 |
| F-004 | Create PWA manifest (icons, display: standalone, theme, splash screen) | PWA | P0 |
| F-005 | Register service worker with cache strategy for static assets | PWA | P0 |
| F-006 | Fix landing page scroll freeze on iOS 18 / iPhone 15 | Core Loop | P0 |

**Acceptance Criteria — F-001:**
- Supabase project created with production-ready config
- Database tables: users, prayer_requests, prayer_interactions, comments, reports
- Row-level security policies defined for all tables
- Migration scripts versioned in the repo
- Environment variables configured

**Acceptance Criteria — F-002:**
- Endpoints: POST /prayers, GET /prayers, GET /prayers/:id, DELETE /prayers/:id
- Pagination and filtering (by category, location) supported
- Rate limiting on POST endpoint
- Consistent error response format

**Acceptance Criteria — F-003:**
- Email/password sign-up and sign-in
- Google OAuth sign-in
- Anonymous opt-in (use without account, prompt to create later)
- Session persistence across browser close
- Sign-out from profile
- Password reset flow

**Acceptance Criteria — F-004:**
- Web App Manifest with icons (192px, 512px), theme colour, background colour
- display: standalone — opens full-screen, no browser chrome
- start_url set to landing page
- Splash screen generated from manifest
- Passes Lighthouse PWA audit

**Acceptance Criteria — F-005:**
- Service worker registered on first visit
- Cache-first strategy for static assets (JS, CSS, images)
- Stale-while-revalidate for API responses
- Graceful update flow (skip waiting + refresh prompt)

**Acceptance Criteria — F-006:**
- Landing page scrolls on iPhone 15 in both Safari and Chrome
- Tested on iOS 18+ with both mobile Safari and Chrome
- No regressions on other devices
- Root cause identified and fixed

---

### Sprint B: Core Loop + Comments (Jun 30–Jul 14)

| ID | Story | Epic | Priority |
|----|-------|------|----------|
| CL-001 | Comments (Reddit-style): table, API, UI, threading, reply button, comment count on cards | Core Loop | P0 |
| CL-002 | Comment notifications: push to submitter on comment, to replied-to user on reply | Core Loop | P1 |
| CL-003 | Push notifications infrastructure: FCM/Web Push, permission prompt, subscribe/unsubscribe | PWA | P1 |
| CL-004 | Comment moderation: report comment, delete own comment, admin delete | Safety | P1 |
| CL-005 | Performance optimization: code splitting, bundle analysis, cold-start target <3s | Core Loop | P1 |
| CL-006 | Contrast/readability fix: dim text brightness, WCAG AA compliance | Core Loop | P1 |

**Acceptance Criteria — CL-001:**
- comments database table: id, prayer_id, user_id, parent_id (nullable), body, created_at
- CRUD API endpoints for comments
- Comment count displayed on prayer feed cards
- Tap comment button opens comment sheet/drawer
- Top-level comments + single-level replies (reply to a comment)
- Reply button on each comment opens inline composer
- Delete own comment
- Report a comment
- No nested threading beyond 1 level (v1.0)

**Acceptance Criteria — CL-002:**
- Prayer submitter receives push notification when someone comments
- Comment author receives push notification when someone replies to their comment
- Notification includes prayer preview + comment preview
- Tap notification opens the prayer with comment thread visible
- Notification dot/badge in app

**Acceptance Criteria — CL-003:**
- FCM / Web Push API integration
- Permission prompt appears after value demonstrated (not on first visit)
- Subscribe/unsubscribe in profile settings
- Notification types: new comment on prayer, reply to comment, someone prayed for prayer

**Acceptance Criteria — CL-004:**
- Report comment flow (three-dot menu → select reason → confirm)
- Reported comments logged in database with reason + timestamp
- Admin delete comment capability
- No pre-approval queue (v1.1 feature)

**Acceptance Criteria — CL-005:**
- Route-level code splitting (lazy load pages)
- Bundle analysis run — total JS bundle under 200KB (gzipped)
- Cold start < 3s on mobile 3G
- Lighthouse performance score > 80

**Acceptance Criteria — CL-006:**
- Relative time labels ("30d ago") match brightness of city/location text
- Prayer card backgrounds checked for WCAG AA contrast compliance
- Base font size verified at minimum 16px
- All text visible on device at 50% brightness

---

### Sprint C: Discovery + Polish (Jul 14–28)

| ID | Story | Epic | Priority |
|----|-------|------|----------|
| DP-001 | Search bar: keyword search across prayer text, location, category | Core Loop | P1 |
| DP-002 | Category redesign: replace broad categories with tag/sub-category system | Core Loop | P1 |
| DP-003 | Map visual refresh: lighter tiles, clearer borders, colour | Core Loop | P2 |
| DP-004 | Translation: "Translate" button on prayer cards, language detection, cache | Discovery | P1 |
| DP-005 | PWA offline support: cache feed + map tiles, graceful offline state | PWA | P2 |
| DP-006 | Install prompt: timed, contextual, iOS step-by-step, Android native prompt | PWA | P1 |
| DP-007 | Save button UX: more prominent placement, visual feedback | Core Loop | P2 |
| DP-008 | Shareable link: generate share URL after prayer submission | Core Loop | P2 |

**Acceptance Criteria — DP-001:**
- Search input in feed header
- Searches across: prayer text, category, location (city + country)
- Results update as user types (debounced, 300ms)
- Empty state: "No prayers found for [query]"
- Clears filters visually

**Acceptance Criteria — DP-002:**
- Current broad categories replaced with tag system
- Multiple tags per prayer (e.g. "Healing: Physical", "Healing: Emotional", "Family: Parenting")
- Tag picker on submit form updated
- Filter by tag on feed
- Tags visible on prayer cards
- Backward compatibility: existing prayers with old categories mapped

**Acceptance Criteria — DP-003:**
- Map tile layer evaluated — lighter option considered
- Clearer country borders
- Optional: colour gradient on markers indicating density or recency
- No performance regression

**Acceptance Criteria — DP-004:**
- Integration with translation API (Google Cloud or DeepL)
- "Translate" button on each prayer card
- Toggle between original and translated text
- Language auto-detection on prayer content
- Translation cache (localStorage or backend)
- User language preference in profile (default: browser locale)
- No auto-translate — only on explicit button tap

**Acceptance Criteria — DP-005:**
- Prayer feed cache for offline reading
- Map tiles cached for offline viewing
- Graceful offline state: "You're offline — showing prayers from earlier"
- Submit button disabled with message when offline

**Acceptance Criteria — DP-006:**
- Prompt appears after user submits first prayer OR after 3rd visit
- Android: Native beforeinstallprompt event captured, custom banner shown
- iOS: Step-by-step overlay ("Tap Share → Add to Home Screen → Add") with screenshots
- Dismissible ("Not now, maybe later")
- Doesn't reappear after dismissal for 7 days
- Detects standalone mode and suppresses

**Acceptance Criteria — DP-007:**
- Save/bookmark button more prominent on prayer cards
- Visual feedback on save (icon fill animation)
- Saved prayers appear in profile's saved section
- No regression on existing save function

**Acceptance Criteria — DP-008:**
- Share button after successful prayer submission generates shareable link
- Link opens the specific prayer in the feed
- Native share sheet on mobile, clipboard copy on desktop
- Link works for non-signed-up users (opens prayer, then prompts to join)

---

### Sprint D: Launch Readiness (Jul 28–Aug 11)

| ID | Story | Epic | Priority |
|----|-------|------|----------|
| LR-001 | CI/CD pipeline: GitHub Actions → Netlify, preview deploys, auto-deploy | Launch | P0 |
| LR-002 | Error monitoring: Sentry SDK, error boundaries, source maps | Launch | P1 |
| LR-003 | Analytics: PostHog, key events tracking, dashboard | Launch | P1 |
| LR-004 | Critical path tests: submit, pray, comment, feed, search, auth | Quality | P1 |
| LR-005 | Accessibility audit: ARIA labels, keyboard nav, WCAG AA, VoiceOver/TalkBack | Quality | P1 |
| LR-006 | Landing page clarity: purpose statement, feature highlights, CTAs | Launch | P1 |
| LR-007 | Church launch collateral: install flyer, demo script, helpers brief | Launch | P2 |

**Acceptance Criteria — LR-001:**
- GitHub Actions workflow for build + deploy to Netlify
- Preview deploys on PR branches
- Production deploy on merge to main
- Build fails on TypeScript errors

**Acceptance Criteria — LR-002:**
- Sentry SDK integrated into React app
- Error boundaries at route level
- Unhandled promise rejections captured
- Source maps uploaded for readable stack traces
- Performance tracing for critical flows

**Acceptance Criteria — LR-003:**
- PostHog or similar privacy-friendly analytics
- Events tracked: prayer submitted, prayed for, comment left, search performed, user signed up, app installed
- Dashboard with weekly active users, retention, top categories
- No PII sent to analytics

**Acceptance Criteria — LR-004:**
- Test: User can submit a prayer
- Test: User can tap "I Prayed" and see count increment
- Test: User can comment on a prayer
- Test: Feed loads and displays prayers
- Test: User can search and see results
- Test: Auth sign-up and sign-in flow

**Acceptance Criteria — LR-005:**
- ARIA labels on all interactive elements
- Keyboard navigation works for all features
- Colour contrast ratios meet WCAG AA minimum
- Focus indicators visible on all interactive elements
- Tested with VoiceOver (iOS) and TalkBack (Android)

**Acceptance Criteria — LR-006:**
- Tagline: "Pray together. Anywhere."
- 1-2 sentence mission statement above the fold
- Three feature highlights (Map, Submit, Pray)
- Beta/prototype transparency notice
- Clear CTA: "Start Praying" (new) / "Sign In" (returning)

**Acceptance Criteria — LR-007:**
- One-page install flyer (screenshots of each install step for iOS + Android)
- Demo script for projector walkthrough
- Helpers brief (how to assist users during launch service)

---

## v1.0 Release Checklist

- [ ] Backend live (Supabase with proper RLS)
- [ ] Auth working (email + Google OAuth + anonymous)
- [ ] PWA installable and passing Lighthouse PWA audit
- [ ] Core prayer loop: submit → feed → pray → comment → notify
- [ ] Search functional (keyword across text, category, location)
- [ ] Categories redesigned with tags/sub-categories
- [ ] Map visually refreshed
- [ ] Translation working on prayer cards
- [ ] Offline reading supported
- [ ] Install prompt working on iOS + Android
- [ ] CI/CD auto-deploying
- [ ] Error monitoring (Sentry) active
- [ ] Analytics (PostHog) tracking key events
- [ ] Critical path tests passing
- [ ] Accessibility audit passed (WCAG AA)
- [ ] Landing page clear and purposeful
- [ ] No known P0 bugs

---

## Deferred to v1.1

| Feature | Rationale |
|---------|-----------|
| Native mobile app (React Native) | PWA first to validate; native planned post-v1.0 |
| @mentions in comments | Reply button covers the need with simpler infra |
| Answered prayer / testimonies | Adds new content type — v1.1 candidate |
| Light/dark mode | Polish, not essential |
| Pray-for-region | Requires data model change + map rework |
| Trending by region | Needs search infra and aggregation |
| Prayer groups / communities | Out of scope for v1.0 |
| Donate | Feature request, not in product vision |
| Full moderation dashboard | Report + admin delete sufficient for v1.0 |
| Real-time updates | v1.1 performance enhancement |
| Follow system | v1.1 community feature |

---

## Legacy Sprint 1 — In-Person Testing (May 12–Jun 13)

| ID | Story | Status |
|----|-------|--------|
| KAN-34 | Recruit testing volunteers | ✅ Done |
| KAN-35 | Compile findings into v0.3 plan | ✅ Done |
| KAN-36 | Create in-person testing session kit | ✅ Done |
| KAN-37 | Schedule and conduct testing sessions (Jun 7) | ✅ Done |

## Legacy v0.2 — The Clarity Sprint (Done)

| ID | Story | Status |
|----|-------|--------|
| KAN-001 | Fix readability (font size 16→17px, card contrast) | ✅ Done |
| KAN-002 | Fix category picker scroll on submit | ✅ Done |
| KAN-003 | Clarifying microcopy (onboarding, feed, submit, map) | ✅ Done |
| KAN-004 | Replace like/react with praying hands | ✅ Done |
| C-001 | Add infinite scroll to prayer feed | ✅ Done |
| C-002 | Add character countdown to submit form | ✅ Done |
| C-003 | Add "I Prayed" confirmation animation | ✅ Done |
| S-001 | Guided submission form | ✅ Done |
| S-002 | Crisis resources on submit page | ✅ Done |
| S-003 | Report button on prayer cards | ✅ Done |
| T-001 | Research crisis hotline numbers | ✅ Done |

---

## Story Format (use for all future stories)

```
### [ID]: [Short title]
**Epic:** [Epic Name]
**Fix Version:** [v0.x]
**Acceptance Criteria:**
- [Criterion 1]
- [Criterion 2]
- [Criterion 3]
```
