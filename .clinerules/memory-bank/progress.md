# Progress - Oratio Prayer Platform

## Current Status
**Phase**: v0.2 — Feedback Iteration (in-person testing session Jun 7)
**Next**: Compile findings and begin v0.3 epics (mid-Jun)
**Deployed**: Yes (Netlify, auto-deploy from main)
**Repo**: github.com/Rkigozi/oratio_global.git

## What's Built (Core Features)
- [x] Splash screen with animated logo
- [x] Onboarding (username creation + validation)
- [x] Sign-in/sign-out flow (login page, session management, profile logout)
- [x] Interactive world map (Leaflet, ESRI Dark Gray tiles)
- [x] Prayer feed with infinite scroll (IntersectionObserver, 20-per-batch)
- [x] Prayer submission (text, location, category, anonymous toggle)
- [x] "I Prayed" interaction (pray/unpray toggle with confirmation)
- [x] User profile (submitted prayers, prayed-for prayers, edit profile)
- [x] Profile detail pages (/profile/submitted, /profile/prayed)
- [x] Prayer deletion from profile
- [x] Windows bridge for cross-tab communication
- [x] Crisis resources on submit page (collapsible, global links)

## The Clarity Sprint (v0.2) — KAN-001 to KAN-005, C-001, S-002, S-003
- [x] KAN-001: Fix readability (font size 16→17px, card contrast)
- [x] KAN-002: Fix category picker scroll on submit (max-height 192→256px)
- [x] KAN-003: Clarifying microcopy (onboarding, feed, submit, map)
- [x] KAN-004: Praying hands reactions (🙏 instead of Heart)
- [x] C-001: Infinite scroll on feed (IntersectionObserver, 20-per-batch)
- [x] S-002: Crisis resources (global links, warm copy, collapsible)
- [x] S-003: Report button on prayer cards (three-dot menu, reason picker)
- [x] Remove "Install Oratio" from info page (too early for PWA)
- [x] Sign-in/sign-out flow (login page, splash routing, profile logout)
- [x] Deployed to Netlify

## Sprint 1 — In-Person Testing (May 12–Jun 13, active)
- [x] KAN-34: Recruit testing volunteers
- [ ] KAN-35: Compile findings into v0.3 plan (due Jun 10)
- [x] KAN-36: Create in-person testing session kit
- [ ] KAN-37: Schedule and conduct testing sessions (Jun 7)

## JIRA + GitHub Integration (May 12)

Backlog managed in JIRA. Source of truth: **KAN** project (Team Oratio).

**GitHub for JIRA app** installed — branches/commits/PRs with `KAN-` in the name auto-link to JIRA issues.

**JIRA CLI** for terminal management (⚠️ CLI uses deprecated API v2 — use JIRA web UI or curl with API v3):
- `curl -u user:token -X POST -H "Content-Type: application/json" -d '{"jql":"project=KAN"}' "https://oratioglobal.atlassian.net/rest/api/3/search/jql"`
- `curl -u user:token -X POST -H "Content-Type: application/json" -d '{"transition":{"id":"41"}}' "https://oratioglobal.atlassian.net/rest/api/3/issue/KAN-N/transitions"`

### Cleanup
- Smart commit git hook removed (replaced by GitHub app)
- `.githooks/` directory deleted
- Test branch `KAN-34-recruit-testers` deleted
- `core.hooksPath` git config unset
- Clarity Sprint 2 (empty, May 15–21) closed
- Sprint 1 extended from May 26 → Jun 13

## Sprint 1 — Beta Landing Page + Mobile Polish (May 13)
- [x] Created beta landing page (`/landing`) replacing `/splash`
- [x] Adaptive CTAs based on session state (signed-out vs new user)
- [x] Session-aware routing: active users skip landing
- [x] Fixed double safe-area padding on notched iPhones
- [x] Auth pages: `px-8` → `px-6` for more content width
- [x] Submit page: single-column grid on small screens
- [x] Feed cards: removed `overflow-hidden` clipping dropdown
- [x] World map: reduced `minHeight` 400px → 250px for landscape
- [x] Landing page: responsive logo, fixed scroll on iPhone, safe-area padding

---
*Last Updated: 2026-06-06*
