# Oratio JIRA Backlog — Epics, Versions & Stories

> **Note:** JIRA API token expired (401). This doc is the local source of truth. Update JIRA manually once token is refreshed.

---

## Fix Versions (Timeline / Phases)

| Version | Name | Status | Dates |
|---------|------|--------|-------|
| v0.1 | Initial Beta | ✅ Deployed | Apr 20 → May 11 |
| v0.2 | Feedback Iteration | ✅ Deployed | May 11 → Jun 6 |
| v0.3 | v1.0 Foundation | ✅ Mostly Complete | Jun 16 → (ongoing) |
| v1.0 | Public Release | In Progress | Ongoing |

### v0.1 — Initial Beta
Deploy prototype with mock data to validate concept and surface critical issues.
**Status:** ✅ Deployed

### v0.2 — Feedback Iteration
Address P1 and P2 feedback from initial user testing. Bug fixes, UX improvements, and high-priority enhancements before wider testing.
**Status:** ✅ Deployed

### v0.3 — v1.0 Foundation
Backend, auth, PWA, comments, search, categories, translation, visual polish, loading/error states, schema cleanup.
**Status:** ✅ Mostly Complete — split `feed.tsx` and `supabase-queries.ts` remaining

### v1.0 — Public Release
CI/CD, monitoring, analytics, testing, accessibility, launch collateral.
**Status:** In Progress — Sentry/PostHog keys needed, lint warnings to fix

---

## Epics

### Epic 1: Foundation — Backend & Data Layer
**Goal:** Replace mock data with a real backend so user data persists across sessions and devices.
**Covers:** Supabase setup, database schema, REST API layer, authentication, data migration.
**Status:** ✅ Complete
- Supabase project with 8 tables: profiles, prayer_requests, prayer_interactions, comments, reports, follows, waitlist, saved_prayers
- Full RLS policies, auto-profile trigger, increment/decrement functions
- Authentication: email/password + Google OAuth
- All pages wired to Supabase (localStorage fallback for unauthenticated)
- Dead schema elements cleaned: dropped `tags`, `is_answered`, `push_subscriptions`, `language_preference`

---

### Epic 2: Core Prayer Loop v2
**Goal:** Polish the submit → feed → pray → comment flow.
**Covers:** Comments, search, save button UX, shareable link, performance optimization.
**Status:** ✅ Mostly Complete
- Comments (Reddit-style threaded, wired to Supabase)
- Comment moderation (report flow, wired to Supabase)
- Search bar + user search (via `searchUsers`)
- Save button with cross-device persistence via `saved_prayers` table
- Shareable link after prayer submission
- Report button + flow
- Performance: code splitting (lazy routes)
- `feed.tsx` (785 lines) needs splitting into smaller components

---

### Epic 3: PWA & App Experience
**Goal:** Deliver a fast, installable mobile experience.
**Covers:** PWA manifest, service worker, offline support, install prompt.
**Status:** ✅ Mostly Complete
- PWA manifest with branded ORATIO icons (16 sizes)
- Service worker (Workbox, precaches 59 entries)
- iOS white flash fix
- Install prompt deferred (no user demand yet)

---

### Epic 4: Discovery & Translation
**Goal:** Let users find prayers that matter, in their language.
**Covers:** Search, hashtags, map, translation.
**Status:** ✅ Complete
- Search bar in feed header (keyword across text, location, category)
- Hashtag system (inline #tags, clickable, trending)
- Map with real Supabase prayer hotspots
- Google Cloud Translation via Supabase Edge Function proxy

---

### Epic 5: Safety & Moderation
**Goal:** Keep Oratio safe with clear guardrails.
**Covers:** Report flow, crisis resources.
**Status:** ✅ Complete
- Report button on prayer cards + prayer detail
- Report reason selection dialog
- Crisis resources on submit page
- Reports logged in `reports` table with RLS

---

### Epic 6: Launch Readiness
**Goal:** The mechanical work to actually ship v1.0.
**Covers:** CI/CD, Sentry, PostHog, landing page, church collateral.
**Status:** 🔶 Mostly Complete — needs env keys
- CI/CD: GitHub Actions (auto type-check/lint/test/build, manual deploy)
- Sentry SDK installed + `logError()` utility routing errors to Sentry
- PostHog SDK installed
- Security headers on Netlify (HSTS, X-Frame-Options, CSP)
- OG meta tags + Twitter Card
- Landing page with purpose statement and CTAs
- **Blocked:** Sentry DSN + PostHog key not yet in `.env`

---

### Epic 7: Testing & Quality
**Goal:** Ship with confidence.
**Covers:** Unit tests, component tests, a11y audit.
**Status:** 🔶 Partial
- 50 unit tests passing (validation, hashtags, data integrity, timeAgo, attribution)
- Loading states + error states with retry on all data-fetching pages
- **Remaining:** No component/E2E tests, no accessibility audit, 74 lint warnings

---

## Current Sprint — Production Hardening

| ID | Story | Epic | Priority | Status |
|----|-------|------|----------|--------|
| PH-001 | Loading states on all data-fetching pages | Quality | P0 | ✅ Done |
| PH-002 | Error states with retry on Supabase failures | Quality | P0 | ✅ Done |
| PH-003 | `console.error` → Sentry logging via `logError()` | Launch | P0 | ✅ Done |
| PH-004 | Saved prayers table + cross-device persistence | Backend | P0 | ✅ Done |
| PH-005 | Wire profile pages to Supabase (submitted, prayed, saved) | Backend | P0 | ✅ Done |
| PH-006 | Dead schema cleanup (tags, push_subs, language, etc.) | Backend | P0 | ✅ Done |
| PH-007 | Split `feed.tsx` (785 lines) into components | Core Loop | P1 | 🔶 Pending |
| PH-008 | Split `supabase-queries.ts` (700+ lines) by domain | Backend | P1 | 🔶 Pending |
| PH-009 | Fix 74 lint warnings (floating promises, any types) | Quality | P2 | 🔶 Pending |
| PH-010 | Add Sentry DSN + PostHog key to `.env` | Launch | P0 | 🔶 Blocked (needs user keys) |

---

## v1.0 Release Checklist

- [x] Backend live (Supabase with proper RLS)
- [x] Auth working (email + Google OAuth)
- [x] PWA installable (manifest + service worker)
- [x] Core prayer loop: submit → feed → pray → comment
- [x] Search functional (keyword across text, location, category)
- [x] Hashtag system with trending
- [x] Map with live Supabase data
- [x] Translation working on prayer cards
- [x] Save/bookmark with cross-device persistence
- [x] Report + moderation flow
- [x] Loading states + error states with retry
- [x] CI/CD pipeline (auto-checks + manual deploy)
- [x] Error monitoring (Sentry SDK + logError utility)
- [x] Security headers (HSTS, X-Frame-Options, CSP)
- [x] OG meta tags + Twitter Card
- [ ] Component + E2E tests
- [ ] Accessibility audit (WCAG AA)
- [ ] `feed.tsx` split into components
- [ ] `supabase-queries.ts` split by domain
- [ ] Lint warnings cleaned (74 → 0)
- [ ] Sentry DSN in `.env`
- [ ] PostHog key in `.env`

---

## Deferred to v1.1

| Feature | Rationale |
|---------|-----------|
| Native mobile app (React Native) | PWA first to validate; oratio-app/ scaffolded but empty |
| @mentions in comments | Reply button covers the need |
| Answered prayer / testimonies | Adds new content type |
| Light/dark mode | Polish, not essential |
| Pray-for-region | Requires data model change |
| Trending by region | Needs search infra |
| Prayer groups / communities | Out of scope |
| Donate | Not in product vision |
| Full moderation dashboard | Report + admin delete sufficient |
| Real-time updates | v1.1 performance enhancement |
| Follow system notifications | Community feature for later |

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
