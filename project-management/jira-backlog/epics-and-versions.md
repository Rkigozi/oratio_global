# Oratio JIRA Backlog — Epics, Versions & Stories

---

## Fix Versions (Timeline / Phases)

| Version | Name | Status |
|---------|------|--------|
| v0.1 | Initial Beta | Deployed |
| v0.2 | Feedback Iteration | In Progress |
| v0.3 | In-Person Test Release | Planned |
| v1.0 | Public Launch | Planned |

### v0.1 — Initial Beta
Deploy prototype with mock data to validate concept and surface critical issues.
**Status:** Deployed

### v0.2 — Feedback Iteration
Address P1 and P2 feedback from initial user testing. Bug fixes, UX improvements, and high-priority enhancements before wider testing.
**Status:** In Progress

### v0.3 — Safety Foundations + In-Person Testing
Guided submission, report UI, safety disclaimers. Structured in-person testing sessions with church members. Fixes and improvements based on direct observation.
**Status:** Planned

### v1.0 — Public Launch
Full moderation queue + dashboard. Backend, auth, PWA, monitoring all live. Launch blockers resolved.
**Status:** Planned

---

## Epics

### Epic 1: Backend & Data Layer
**Goal:** Replace mock data with a real backend so user data persists across sessions and devices.
**What it covers:** Supabase setup, database schema (users, prayers, interactions), REST API layer, authentication, real-time updates, data migration from localStorage.
**Launch gate:** Must be live before v1.

---

### Epic 2: Authentication & Onboarding
**Goal:** Let users create accounts and return to their data while keeping the friction-free start.
**What it covers:** Anonymous opt-in vs lightweight sign-up (email/OAuth), session persistence, onboarding polish, account recovery.
**Launch gate:** Required for v1.

---

### Epic 3: Core Prayer Loop
**Goal:** Polish the submit -> feed -> pray flow so it's fast, reliable, and handles real-world usage.
**What it covers:** Feed pagination/infinite scroll, submit form edge cases, "I Prayed" rate limiting, answered prayer marking, search, share improvements.
**Launch gate:** Polish before v1.

---

### Epic 4: Safety & Moderation
**Goal:** Keep Oratio a safe, respectful space with clear guardrails against harmful content.
**What it covers:** Guided submission form, safety disclaimers, crisis resource links, report inappropriate content flow, content moderation queue, content filtering.
**Launch gate:** Frontend work begins v0.3 (guided submission, report UI, safety disclaimers). Full moderation infrastructure (queue, dashboard, auto-filtering) targets v1.0.

---

### Epic 5: User Profile & Community
**Goal:** Give users a meaningful sense of their prayer journey and connection to others.
**What it covers:** Profile persistence with backend, follow/unfollow, profile sharing, prayer history/stats with real data, activity feed.
**Launch gate:** v1 candidate.

---

### Epic 6: Performance & PWA
**Goal:** Deliver fast, installable mobile experience that works reliably on slow networks.
**What it covers:** Service worker, Web App Manifest, offline fallback, bundle optimization, Lighthouse > 90, load time < 3s on 3G.
**Launch gate:** High priority for v1.

---

### Epic 7: Testing & Quality
**Goal:** Ship with confidence by catching regressions before they reach users.
**What it covers:** Jest + RTL setup, critical path tests (submit, pray, feed), a11y audit, cross-browser testing, QA checklist.
**Launch gate:** Release gate for v1.

---

### Epic 8: Release & Launch
**Goal:** The mechanical work to actually ship v1 and know how it's performing.
**What it covers:** CI/CD pipeline (GitHub Actions -> Netlify), error monitoring (Sentry), analytics (PostHog or similar), landing/marketing page, SEO meta, launch checklist.
**Launch gate:** Required for v1.

---

### Epic 9: Beta Testing & Validation
**Goal:** Recruit, coordinate, and synthesize feedback from real users to validate the app before public launch.
**What it covers:** Recruiting testers, test session scripts, observation logistics, compiling findings into prioritized changes, tracking which feedback gets actioned, communicating updates to testers.
**Launch gate:** Produces the change list that feeds v0.3 and ultimately v1.0.

---

## Example Stories — Epic 1: Backend & Data Layer

### B-001: Set up Supabase project and database schema
**Epic:** Backend & Data Layer
**Fix Version:** v0.3
**Acceptance Criteria:**
- Supabase project created with production-ready config
- Database tables: users, prayer_requests, prayer_interactions, reports
- Row-level security policies defined for all tables
- Migration scripts versioned in the repo

### B-002: Create REST API for prayer CRUD
**Epic:** Backend & Data Layer
**Fix Version:** v0.3
**Acceptance Criteria:**
- Endpoints: POST /prayers, GET /prayers, GET /prayers/:id, DELETE /prayers/:id
- Pagination and filtering (by category, location) supported
- Rate limiting on POST endpoint
- Error responses follow consistent format

### B-003: Migrate prayer data from localStorage to Supabase
**Epic:** Backend & Data Layer
**Fix Version:** v1.0
**Acceptance Criteria:**
- Existing localStorage prayers are uploaded on first login
- No data loss during migration
- Old localStorage data is cleared after successful migration
- User sees their prayer history uninterrupted

### B-004: Implement real-time prayer feed updates
**Epic:** Backend & Data Layer
**Fix Version:** v1.0
**Acceptance Criteria:**
- New prayers appear in feed without manual refresh
- Prayer count updates in real-time when someone prays
- Subscription cleanup on component unmount
- Graceful fallback if real-time connection fails

### B-005: Set up environment variable management
**Epic:** Backend & Data Layer
**Fix Version:** v0.2
**Acceptance Criteria:**
- Supabase URL and anon key stored in .env files
- Variables accessible in both dev and production
- .env.example checked into repo (no secrets)
- Vite env prefix (VITE_) configured correctly

---

## Example Stories — Epic 3: Core Prayer Loop (v0.2 feedback items)

### C-001: Add infinite scroll to prayer feed
**Epic:** Core Prayer Loop
**Fix Version:** v0.2
**Acceptance Criteria:**
- Feed loads initial 20 prayers, then loads more on scroll
- Loading spinner shown during fetch
- No duplicate prayers on pagination boundary
- Works on mobile touch scroll

### C-002: Add character countdown to submit form
**Epic:** Core Prayer Loop
**Fix Version:** v0.2
**Acceptance Criteria:**
- Shows "X/500" below textarea, updating on each keystroke
- Turns red when approaching limit (e.g., > 450)
- Input is blocked at 500 characters
- Counter is visible and accessible

### C-003: Add "I Prayed" confirmation animation
**Epic:** Core Prayer Loop
**Fix Version:** v0.2
**Acceptance Criteria:**
- Tap "I Prayed" button shows visual confirmation (checkmark, color change)
- Count increments immediately
- Double-tap within 1 second is debounced
- Haptic or subtle animation feedback

---

## Sprint 1 — The Clarity Sprint (v0.2)

### KAN-001: Fix readability (font size + card contrast)
**Epic:** Core Prayer Loop
**Fix Version:** v0.2
**Acceptance Criteria:**
- Base font size increased from 16px to 17px
- Prayer card backgrounds slightly lightened for better text contrast
- All text remains readable on mobile viewport

---

### KAN-002: Fix category picker scroll on submit
**Epic:** Core Prayer Loop
**Fix Version:** v0.2
**Acceptance Criteria:**
- All 6 categories visible in dropdown without clipping
- Dropdown scrolls properly on mobile when keyboard is open
- No layout shift when dropdown opens

---

### KAN-003: Add clarifying microcopy across key touchpoints
**Epic:** Core Prayer Loop
**Fix Version:** v0.2
**Acceptance Criteria:**
- Onboarding screen includes purpose statement: "Oratio connects people around the world through prayer. Share your needs. Pray for others. You're not alone."
- "I Prayed" button text changed to "Pray for this" / "Prayed for this"
- Submit success copy updated to: "Your prayer is on the map and in the feed. People around the world will see it and pray."
- Prayer guidance hint shown on first submit visit
- All microcopy changes visible across desktop and mobile

---

### KAN-004: Replace like/react with praying hands
**Epic:** Core Prayer Loop
**Fix Version:** v0.2
**Acceptance Criteria:**
- All prayer reaction buttons use 🙏 instead of Heart icon
- Pray toggle visual state (prayed/unprayed) still distinguishable via opacity
- Navigation Heart icons (bottom nav, stats, etc.) remain unchanged
- No regressions in any profile page prayer interaction

---

## Epic 4: Safety & Moderation (v0.3)

### S-001: Guided submission form (prompted fields + gentle guidelines)
**Type:** Story
**Epic:** Safety & Moderation
**Fix Version:** v0.3
**Acceptance Criteria:**
- Submit page textarea has prompted placeholder: "What would you like prayer for?"
- Optional second field: "How are you feeling right now?" (emotional tag)
- Gentle guidance shown subtly above or below the form: "You're welcome to share what's on your heart. You may want to avoid sharing specific addresses or phone numbers so you can receive prayer freely and safely."
- Existing category picker remains unchanged
- Anonymous toggle remains unchanged
- No regressions to existing submit flow

---

### S-002: Add care-focused disclaimer + crisis resource links
**Type:** Story
**Epic:** Safety & Moderation
**Fix Version:** v0.3
**Acceptance Criteria:**
- Care-focused message displayed on submit page: "If you're going through something really difficult — like thoughts of harming yourself or immediate danger — please reach out to the resources below. They're trained to help. We're praying with you."
- Links to crisis hotlines: suicide prevention, domestic violence, mental health support
- Message is visible but unobtrusive, framed with warmth not warning
- Links open in new tab with rel="noopener noreferrer"

---

### S-003: Add report button to prayer cards
**Type:** Story
**Epic:** Safety & Moderation
**Fix Version:** v0.3
**Acceptance Criteria:**
- Three-dot menu icon on each prayer card (feed + profile)
- Menu includes "Report" option
- Report dialog with reason picker: Spam, Upsetting content, Harmful or unsafe, Other
- Confirmation shown after report: "Thanks for looking out for this community. We'll review this prayer."
- Report data stored to localStorage (non-functional until v1.0 backend)
- Report button is visually subtle, not prominent

---

### T-001: Research crisis hotline numbers for deployment regions
**Type:** Task
**Epic:** Safety & Moderation
**Fix Version:** v0.3
**Acceptance Criteria:**
- Compile list of crisis hotline numbers (suicide prevention, domestic violence, mental health)
- Source from verified official organizations
- Document for inclusion in S-002 disclaimer

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
