# Active Context - Oratio Prayer Platform

## Current Phase: v0.2 — Feedback Iteration (Polishing for in-person testing)

**Status**: Sprint 1 complete. Ready for in-person testing.
**Next**: Schedule and conduct in-person testing sessions with church members

## What's Deployed

- Splash screen → onboarding (username) → login → home map → feed → submit → profile
- Sign-in/sign-out flow (session management, login page, profile logout)
- Interactive world map with prayer hotspots (concentric circle markers)
- Prayer feed with infinite scroll (20-per-batch, IntersectionObserver)
- Prayer submission (text, location, category, anonymous toggle)
- "I Prayed" interaction (pray/unpray with confirmation)
- User profile (submitted prayers, prayed-for prayers, edit profile)
- Crisis resources on submit page (collapsible, global links, warm copy)
- Report button on prayer cards (three-dot menu, reason picker, localStorage)
- Praying hands reactions, clarifying microcopy across all touchpoints
- All client-side with mock data + localStorage

## Session Updates (May 11)

- Removed "Install Oratio" section from info page (too early for PWA install guides)
- Created crisis resources component (warm copy, 3 global links: Find A Helpline, Befrienders, IASP)
- Placed on submit page — below submit button, collapsible (starts closed), out of prayer flow
- Experimented with map lights (glowing orbs via divIcon) — user reverted to original concentric circles
- Implemented infinite scroll on feed (IntersectionObserver, batch of 20, resets on filter change)
- Committed & pushed (edded75) — Netlify auto-deploy triggered

## Feedback So Far (First Wave)

**P1 (Launch Blockers):**
- Feed UX unclear — users don't understand the flow (addressed: KAN-003 microcopy)
- Readability concerns — dark background + small font (addressed: KAN-001 font size bump)

**P2 (v1 Candidates):**
- Prayer Map is the emotional centerpiece — keep central
- Prayer guidance suggestions for new users (addressed: guidance hint on first submit)
- Real prayer behavior happening — validate repeat engagement

**P3 / Deferred:**
- Community/fellowship features (post-v1)
- Feed filtering by proximity + interests (Rev. Joshua's request)
- Location clarity — prayer "from" vs prayer "for" on map (Jemima's feedback)
- Teen version (Naomi's idea)

## Active Decisions

### Backend Timing
Decision: Delay backend until after in-person testing (v0.3+). No point building Supabase until UX is validated.

### PWA Timing
Decision: Delay PWA until v0.3+. Core UX polish comes first.

### Testing
Decision: In-person observation is higher priority than automated tests at this stage. Testing framework deferred to v0.3.

### Crisis Resources
Decision: Use global resource links (Find A Helpline, Befrienders Worldwide, IASP) instead of country-specific hotlines. No location detection — avoids risk of wrong numbers.

### Map Lights
Decision: Keep original concentric circle markers (gold inner + blue outer). Glowing orb experiment reverted.

## Upcoming Milestones

### In-Person Testing (Next)
- [ ] Recruit 6 volunteers (Paul, Jemima, Naomi, Khaled, Rev. Joshua, anonymous)
- [ ] Schedule 15-20 min sessions
- [ ] Observe without guiding
- [ ] Take notes on friction points
- [ ] Compile findings into v0.3 plan

### v0.3 — Post-Testing
- Act on in-person testing observations
- Backend setup (Supabase schema, API, auth)
- PWA implementation
- Tech debt (design tokens, testing framework, error handling)

### v1.0 — Public Launch
- All launch blockers resolved
- CI/CD, monitoring, analytics live
- Performance targets met
- Moderation/reporting in place

---
*Last Updated: 2026-05-11*
