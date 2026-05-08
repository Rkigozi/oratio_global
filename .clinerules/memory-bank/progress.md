# Progress - Oratio Prayer Platform

## Current Status
**Phase**: v0.2 — Feedback Iteration (Sprint 1: "The Clarity Sprint")
**Next**: In-person testing
**Deployed**: Yes (Netlify)
**Repo**: github.com/Rkigozi/oratio_global.git

## What's Built (Core Features)
- [x] Splash screen with animated logo
- [x] Onboarding (username creation + validation)
- [x] Interactive world map (Leaflet, ESRI Dark Gray tiles)
- [x] Prayer feed (global, trending/recent, category + location filtering)
- [x] Prayer submission (text, location, category, anonymous toggle)
- [x] "I Prayed" interaction (pray/unpray toggle with confirmation)
- [x] User profile (submitted prayers, prayed-for prayers, edit profile)
- [x] Profile detail pages (/profile/submitted, /profile/prayed)
- [x] Prayer deletion from profile
- [x] Windows bridge for cross-tab communication

## What's Cleaned (Code Quality)
- [x] Fonts fixed (were never loading — now Inter + Sora via <link>)
- [x] Unused dependencies removed (69 → ~20 packages)
- [x] Type packages moved to devDependencies
- [x] React updated from 18 to 19
- [x] Privacy fix (approximate coordinates only)
- [x] Input validation (Zod for prayer submission)
- [x] ESLint + Prettier configured
- [x] Debug console.logs removed
- [x] Stale configs deleted (eslint.config.js.v9, postcss.config.mjs)
- [x] Vestigial tab system in Feed simplified
- [x] Architecture-Notes.md archived (was misleading)
- [x] All doc statuses updated to match reality

## What's Left

### v0.2 — Feedback Iteration (Sprint 1: "The Clarity Sprint")
- [x] Feedback processed and synthesized from Google Form responses
- [x] JIRA backlog updated with KAN-001 through KAN-004
- [x] KAN-001: Fix readability (font size + card contrast) — **Done**
- [x] KAN-002: Fix category picker scroll on submit — **Done**
- [x] KAN-003: Add clarifying microcopy across key touchpoints — **Done**
- [x] KAN-004: Replace like/react with 🙏 praying hands — **Done**
- [ ] Deploy Sprint 1 to Netlify for tester access
- [ ] Conduct in-person testing sessions with church members
- [ ] Compile testing observations into v0.3 plan

### v0.3 — In-Person Test Release
- [ ] Recruit and schedule testers
- [ ] Structured testing sessions
- [ ] Supabase project + database schema
- [ ] REST API layer
- [ ] Authentication
- [ ] PWA setup (manifest, service worker)
- [ ] Component architecture restructure

### v1.0 — Public Launch
- [ ] All v0.2 + v0.3 blockers resolved
- [ ] CI/CD pipeline (GitHub Actions → Netlify)
- [ ] Error monitoring (Sentry)
- [ ] Analytics
- [ ] Safety/moderation (report flow, disclaimers)
- [ ] Performance (pagination, code splitting, Lighthouse > 90)
- [ ] Testing framework + critical path tests
- [ ] Performance targets: < 3s load on 3G, bundle < 500KB

---
*Last Updated: 2026-05-08*
