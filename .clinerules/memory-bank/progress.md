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

## What's Left

### In-Person Testing (Next)
- [ ] Recruit and schedule 6 volunteers
- [ ] Conduct structured 15-20 min sessions
- [ ] Observe without guiding
- [ ] Compile observations into prioritized changes

### v0.3 — Post-Testing
- [ ] Act on in-person testing feedback
- [ ] Supabase project + database schema
- [ ] REST API layer
- [ ] Authentication
- [ ] PWA setup (manifest, service worker)
- [ ] Component architecture restructure
- [ ] Feed filtering by proximity + interests (feedback item)

### v1.0 — Public Launch
- [ ] All v0.2 + v0.3 blockers resolved
- [ ] CI/CD pipeline (GitHub Actions → Netlify)
- [ ] Error monitoring (Sentry)
- [ ] Analytics
- [ ] Safety/moderation infrastructure (queue, dashboard, auto-filtering)
- [ ] Performance (code splitting, Lighthouse > 90)
- [ ] Testing framework + critical path tests
- [ ] Performance targets: < 3s load on 3G, bundle < 500KB

---
*Last Updated: 2026-05-11*
