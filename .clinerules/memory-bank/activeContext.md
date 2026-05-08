# Active Context - Oratio Prayer Platform

## Current Phase: v0.2 — Feedback Iteration

**Status**: Sprint 1 ("The Clarity Sprint") in progress
**Goal**: Eliminate confusion so in-person testers can use the app without guidance
**Next**: Deploy Sprint 1 → In-person testing with church members

## What's Deployed

- Splash screen → onboarding (username) → home map → feed → submit → profile
- Interactive world map with prayer hotspots
- Prayer feed (trending + recent, category + location filtering)
- Prayer submission (text, location, category, anonymous toggle)
- "I Prayed" interaction (pray/unpray with confirmation)
- User profile (submitted prayers, prayed-for prayers, edit profile)
- All client-side with mock data + localStorage

## Recent Cleanup (May 8)

- Fonts fixed — DM Sans was never loading, switched to Inter + Sora via <link>
- Unused dependencies removed (8 packages deleted from package.json)
- Type packages moved to devDependencies
- Debug console.logs removed from production code
- Stale configs deleted (eslint.config.js.v9, postcss.config.mjs)
- Feed tab system simplified (removed vestigial single-tab code)
- Design docs moved from src/imports/ to project_scope/design-imports/
- Architecture-Notes.md archived (described non-existent React Native + Supabase)
- All documentation statuses updated to reflect current reality

## Feedback So Far (First Wave)

**P1 (Launch Blockers):**
- Feed UX unclear — users don't understand the flow
- Readability concerns — dark background + small font

**P2 (v1 Candidates):**
- Prayer Map is the emotional centerpiece — keep central
- Prayer guidance suggestions for new users
- Real prayer behavior happening — validate repeat engagement

**P3 / Deferred:**
- Community/fellowship features (post-v1)
- Emotional atmosphere signals (strategic note, not a task)

## Active Decisions

### Backend Timing
Decision: Delay backend until after in-person testing (v0.3+). No point building Supabase until UX issues are resolved.

### PWA Timing
Decision: Delay PWA until v0.3+. Core UX polish comes first.

### Testing
Decision: In-person observation is higher priority than automated tests at this stage. Testing framework deferred to v0.3.

### v0.2 Scope
Decision: Sprint 1 is feedback-driven UX fixes only (KAN-001 through KAN-004). No tech debt (design tokens, testing, error handling) — all deferred to v0.3.

## Upcoming Milestones

### v0.2 — Sprint 1: "The Clarity Sprint"
- [x] Feedback processed and synthesized from 6 Google Form responses
- [x] JIRA backlog updated with KAN-001 through KAN-004
- [x] KAN-001: Fix readability (font size + card contrast)
- [x] KAN-002: Fix category picker scroll on submit
- [x] KAN-003: Add clarifying microcopy across key touchpoints
- [x] KAN-004: Replace like/react with 🙏 praying hands
- [ ] Deploy to Netlify
- [ ] Conduct in-person testing sessions with church members (6 respondents volunteered)

### v0.3 — Post-Testing Iteration
- Compile in-person testing observations
- Backend setup (Supabase schema, API, auth)
- PWA implementation
- Tech debt (design tokens, testing framework, error handling)

### v1.0 — Public Launch
- All launch blockers resolved
- CI/CD, monitoring, analytics live
- Performance targets met
- Moderation/reporting in place

---
*Last Updated: 2026-05-08*
