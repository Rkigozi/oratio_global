# Progress - Oratio Prayer Platform

## Current Status
**Phase**: v0.2 — Feedback Iteration (Sprint 1 complete, ready for in-person testing)
**Next**: In-person testing with church members
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

## Sprint 1 — The Clarity Sprint (v0.2)
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

## JIRA + GitHub Integration (May 12)

Backlog managed in JIRA. Source of truth: **KAN** project (Team Oratio).

**GitHub for JIRA app** installed — branches/commits/PRs with `KAN-` in the name auto-link to JIRA issues.

**JIRA CLI** for terminal management:
- `jira ls -p KAN` — list issues
- `jira sprint -r "KAN board" -s "Sprint 1"` — view sprint
- `jira jql "project=KAN"` — run JQL
- `jira start/stop/done KAN-N` — transition statuses

### Cleanup
- Smart commit git hook removed (replaced by GitHub app)
- `.githooks/` directory deleted
- Test branch `KAN-34-recruit-testers` deleted
- `core.hooksPath` git config unset

---
*Last Updated: 2026-05-12*
