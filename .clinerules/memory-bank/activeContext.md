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

## JIRA + GitHub Integration (May 12)

**Integration:** GitHub for JIRA app — branches/commits/PRs with `KAN-` in the name auto-link to JIRA issues.

**JIRA CLI** (`jira-cli`) used for terminal-based issue management. Config at `.jira-cli/config.json` (gitignored).

**KAN** project fully populated:

### Active Sprint
**Sprint 1 — In-Person Testing** (May 12–Jun 13)
- KAN-34: Recruit testing volunteers ✅
- KAN-35: Compile findings into v0.3 plan (due Jun 10)
- KAN-36: Create in-person testing session kit ✅
- KAN-37: Schedule and conduct testing sessions (Jun 7)

### Epic Backlog (v0.3 → v1.0)
| Epic | Key | Timeline |
|------|-----|----------|
| Sprint 0 — Foundation (✅ Done) | KAN-63 | Apr 20 → May 11 |
| Beta Testing & Validation | KAN-24 | Jun 6 → Jun 13 |
| Backend & Data Layer | KAN-25 | Jun 16 → Jul 7 |
| Core Prayer Loop (v0.3 Polish) | KAN-27 | Jun 16 → Jun 30 |
| Authentication & Onboarding | KAN-26 | Jun 23 → Jul 7 |
| Safety & Moderation (v1.0) | KAN-28 | Jul 7 → Jul 28 |
| User Profile & Community | KAN-29 | Jul 7 → Jul 28 |
| Performance & PWA | KAN-30 | Jul 14 → Aug 4 |
| Testing & Quality | KAN-31 | Jul 14 → Aug 4 |
| Release & Launch | KAN-32 | Jul 28 → Aug 11 |

29 stories + 1 subtask across 9 future epics. Sprint 0 closed with 11 items done.

## Session Summary (May 12)

### What Got Done
- **JIRA CLI connected** to KAN (Team Oratio) project at oratioglobal.atlassian.net
- **Full backlog populated** — 10 epics, 39 stories, 1 subtask (50 total issues)
- **Sprint 0 — Foundation** created & closed (11 items, all Done)
- **Sprint 1 — In-Person Testing** created & active (4 tasks, later extended to Jun 13)
- **GitHub for JIRA app** integration tested and working — branches with `KAN-` auto-link
- **Timeline dates** set on all 9 future epics (May 12 → Jul 21)
- **Issue types corrected** — ops/infra items set to Task, features set to Story
- **Parent-child date conflicts fixed** — KAN-38 moved to KAN-32, KAN-39 moved to KAN-30, KAN-74 moved to Sprint 1
- **Stale branch** `focus-group-simplification` deleted
- **Smart commit hook + convention doc** removed (using GitHub app instead)
- **KAN-75** added: Landing, About, and marketing pages (under KAN-32)

### Backlog Health
- v0.3 (Jun 16 → Jul 7): Backend, Auth, Core Prayer Loop Polish
- v1.0 (Jul 7 → Aug 11): Safety, Profile, PWA, Testing, Release
- Minor gaps noted (search, error boundaries, loading states) — deferred

## Session Summary (May 13) — Beta Landing Page + Mobile Audit

### What Got Built
- **Beta Landing Page** (`/landing`) — replaced auto-redirecting splash page
  - Animated "O" + cross hero entrance
  - Tagline: "Pray together. Anywhere."
  - Mission statement + 3 feature cards (Map, Submit, Pray)
  - Beta/prototype transparency notice
  - Adaptive CTAs: "Start Praying" (first visit), "Sign In"/"Create Profile" (returning)
  - Session-aware routing: active users skip landing, signed-out/first-time users see it

### Routing Changes
- `/splash` → `/landing` route rename
- Layout.tsx: only redirect `/` → `/landing` if session is NOT active
- All `navigate("/splash")` calls updated to `navigate("/landing")`
- `splash.tsx` deleted

### Mobile UI Audit Fixes (all pages checked)
| Fix | Impact |
|---|---|
| **Double safe-area padding** | Removed `env(safe-area-inset-*)` from `#root` in `index.html` — Header and BottomNav now handle it exclusively |
| **Auth pages too cramped** | `onboarding.tsx` & `login.tsx`: `px-8` → `px-6` (content width 256px → 272px on 320px screens) |
| **Submit grid too narrow** | `submit.tsx`: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` (stacks on small screens) |
| **Feed dropdown clipped** | `feed-card.tsx`: removed `overflow-hidden` from card wrapper so the three-dot menu isn't cut off |
| **Map overflow in landscape** | `world-map-clean.tsx`: `minHeight` reduced from 400px to 250px |
| **Landing logo too large** | `landing.tsx`: `6rem` → `clamp(4.5rem, 15vw, 6rem)` for responsive sizing |
| **Landing scroll broken on iPhone** | Outer container: `min-h-screen` → `h-dvh` so `overflow-y-auto` actually triggers; added `pb-[max(2rem,env(safe-area-inset-bottom))]` for home indicator |

### Next
- In-person testing sessions — confirm venue with Vicar Ben, recruit volunteers

---
*Last Updated: 2026-05-13*
*Next: In-person testing sessions — confirm venue with Vicar Ben, recruit volunteers*
