# Active Context - Oratio Prayer Platform

## Current Phase: v0.1 — Initial Beta

**Status**: Deployed on Netlify, collecting user feedback via Google Sheet
**Goal**: Gather enough signal to build a prioritized v1 backlog
**Next Phase**: v0.2 — Feedback Iteration (implement P1/P2 changes)

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
Decision: Delay backend until after v0.2 feedback iteration. No point building Supabase until P1 UX issues are resolved.

### PWA Timing
Decision: Delay PWA until v0.3. Core UX polish comes first.

### Testing
Decision: No test framework yet. Will add in v0.2 as part of quality foundation.

## Upcoming Milestones

### v0.2 — Feedback Iteration
- Triage all feedback from Google Sheet
- Fix P1 items (feed clarity, readability/accessibility)
- Implement P2 candidates from triage
- Begin design tokens and component structure

### v0.3 — In-Person Test Release
- Recruit 5-10 in-person testers
- Conduct structured testing sessions
- Backend setup (Supabase schema, API, auth)
- PWA implementation

### v1.0 — Public Launch
- All launch blockers resolved
- CI/CD, monitoring, analytics live
- Performance targets met
- Moderation/reporting in place

---
*Last Updated: 2026-05-08*
