# Oratio Backlog - User Stories

## What Are User Stories?
User stories are simple descriptions of what users want to do, written from their perspective. They follow this format:

**"As a [type of user], I want to [do something] so that [I get some benefit]."**

User stories help us stay focused on solving real problems for real people.

---

## How to Read This Document

### Status Icons
- ✅ **Done** - Implemented and tested
- 🔄 **In Progress** - Currently being worked on
- ⏳ **Planned** - Scheduled for future work
- ❓ **Backlog** - Under consideration, not yet scheduled

### Priority Levels
- **P1 (Critical)** - Must have for launch
- **P2 (Important)** - Should have for good experience
- **P3 (Nice-to-have)** - Can come later

### Linked Documents
Each story references our existing documentation:
- **MVP-Scope.md** - What we're building for the first version
- **User-flows.md** - How users move through the app
- **Data-Model.md** - How data is structured
- **API-Behaviours.md** - How the app communicates with servers

---

## Onboarding & First Experience

### Story 1: Simple Entry
⏳ **P1** - **As a first-time user, I want to start using Oratio immediately without creating an account, so that I can experience the value quickly.**

**Why this matters:** Friction stops people. We want everyone to feel welcome and able to participate immediately.

**Linked to:** MVP-Scope.md (lightweight onboarding), User-flows.md (3.1 Onboarding)

**Acceptance Criteria:**
- User can open the app and see content immediately
- No email, password, or social login required
- Can choose a profile icon (optional)
- Can enter a display name (optional)
- Can start browsing prayers within 30 seconds

---

### Story 2: Choose Identity
⏳ **P1** - **As a new user, I want to choose a profile icon and optional name, so that I can have a personal identity without exposing my real identity.**

**Why this matters:** People want to feel present but not exposed. Visual identity helps community building without privacy risk.

**Linked to:** Data-Model.md (User entity), Design-System.md (visual identity)

**Acceptance Criteria:**
- Selection of 10+ simple, neutral icons (dove, heart, cross, etc.)
- Optional text field for display name (max 20 characters)
- Clear message that this is for display only, not real identity
- Can change icon/name later in profile

---

## Exploring & Discovering Prayers

### Story 3: Browse Prayer Feed
⏳ **P1** - **As a user, I want to browse a feed of prayer requests, so that I can find prayers to support.**

**Why this matters:** The feed is where users discover needs and opportunities to help.

**Linked to:** MVP-Scope.md (Core Features - Feed), User-flows.md (3.3 Browse Feed)

**Acceptance Criteria:**
- Scrollable list of prayer requests
- Each prayer shows: message, location (city/country), prayer count, time ago
- Can switch between "Trending" (most prayed for) and "Recent" (newest)
- Loads quickly (under 2 seconds)

---

### Story 4: Filter by Category
⏳ **P2** - **As a user, I want to filter prayers by category, so that I can focus on areas I care about most.**

**Why this matters:** Different people care about different needs. Filtering helps users find what resonates with them.

**Linked to:** MVP-Scope.md (Core Features - Feed), Data-Model.md (PrayerRequest category)

**Acceptance Criteria:**
- Category filter buttons/selector above feed
- Categories: Healing, Family, Provision, Peace, Guidance, Thanksgiving, Other
- Can select multiple categories
- Clear visual feedback on active filters
- "Clear filters" option

---

### Story 5: Global Prayer Map
⏳ **P1** - **As a user, I want to see prayer activity on a world map, so that I can understand the global reach of Oratio.**

**Why this matters:** The map creates visual impact and helps users feel part of a worldwide community.

**Linked to:** MVP-Scope.md (Core Features - Map), User-flows.md (3.2 Explore)

**Acceptance Criteria:**
- Interactive world map with prayer activity markers
- Markers show approximate locations (city level, not exact)
- Tap marker to see prayer count for that location
- Smooth zoom and pan interactions
- Works on mobile and desktop

---

## Submitting Prayers

### Story 6: Submit Prayer Request
⏳ **P1** - **As a user, I want to submit a prayer request with a message and location, so that others can pray for me.**

**Why this matters:** This is the core action—sharing a need with the community.

**Linked to:** MVP-Scope.md (Core Features - Submit Prayer), User-flows.md (3.6 Submit Prayer)

**Acceptance Criteria:**
- Simple form with message field (required)
- Character limit with counter (e.g., 500 characters max)
- Category selector (optional)
- Location detection or manual entry (city/country)
- Anonymous toggle (submit without showing profile)
- Clear submit button with loading state
- Success confirmation with option to share

---

### Story 7: Privacy Protection
⏳ **P1** - **As a user submitting a prayer, I want my exact location to be protected, so that my privacy is maintained.**

**Why this matters:** People share sensitive requests. We must protect their privacy absolutely.

**Linked to:** MVP-Scope.md (privacy-safe), Data-Model.md (no exact coordinates)

**Acceptance Criteria:**
- Never stores or displays exact coordinates
- Only stores city and country (e.g., "London, UK")
- Clear explanation in UI about privacy protection
- No technical way to retrieve exact location from our system

---

### Story 8: Anonymous Submission
⏳ **P1** - **As a user, I want to submit prayers anonymously, so that I can share sensitive requests without identity exposure.**

**Why this matters:** Some prayers are too personal or sensitive to attach to identity.

**Linked to:** MVP-Scope.md (anonymous option), Data-Model.md (submitAsAnonymous)

**Acceptance Criteria:**
- Toggle switch "Submit anonymously"
- When anonymous: shows generic icon instead of user's profile
- Clear explanation of what anonymous means
- Can still manage own prayers in profile (owner knows they submitted)

---

## Supporting Others' Prayers

### Story 9: Pray for Others
⏳ **P1** - **As a user, I want to tap "I Prayed" on a prayer request, so that the requester knows they're being supported.**

**Why this matters:** This simple interaction creates connection and shows support.

**Linked to:** MVP-Scope.md (Core Features - Prayer Interaction), User-flows.md (3.4 Pray)

**Acceptance Criteria:**
- "I Prayed" button on each prayer card
- Tap increments prayer count immediately
- Visual feedback (animation, color change)
- Can only pray once per prayer (prevents spam)
- Prayer count visible to all users

---

### Story 10: Translation Support
⏳ **P2** - **As a user, I want to translate prayers to my language, so that I can understand prayers from around the world.**

**Why this matters:** Oratio is global. Language shouldn't be a barrier to prayer.

**Linked to:** MVP-Scope.md (translation on-demand), Data-Model.md (TranslationCache)

**Acceptance Criteria:**
- "Translate" button on prayers not in user's language
- Shows original language and translated version
- Caches translations to avoid repeat API calls
- Supports major languages (English, Spanish, French, Portuguese, etc.)
- Clear attribution to translation service

---

## Personal Journey & Profile

### Story 11: View My Stats
⏳ **P2** - **As a user, I want to see my prayer statistics, so that I can track my prayer journey.**

**Why this matters:** People want to see their impact and remember their own requests.

**Linked to:** MVP-Scope.md (Core Features - Profile), User-flows.md (3.7 Profile)

**Acceptance Criteria:**
- Profile screen with: Prayers Submitted, Prayers Prayed For, Answered Prayers
- Clean, encouraging presentation
- Time period filters (all time, this month, this week)
- Visual progress indicators

---

### Story 12: View My Prayers
⏳ **P2** - **As a user, I want to see all the prayers I've submitted, so that I can remember my requests and mark answers.**

**Why this matters:** Personal history matters. People want to follow up on their own prayers.

**Linked to:** User-flows.md (3.7 Profile), Data-Model.md (user-prayer relationship)

**Acceptance Criteria:**
- "My Prayers" tab in profile
- List of all prayers I've submitted (oldest to newest)
- Status indicators (active, answered)
- Can mark as answered from this list
- Can edit/delete own prayers (with confirmation)

---

### Story 13: View Prayed For
⏳ **P2** - **As a user, I want to see all the prayers I've prayed for, so that I can follow up and remember who I'm supporting.**

**Why this matters:** Encourages ongoing support and creates personal prayer lists.

**Linked to:** User-flows.md (3.7 Profile), Data-Model.md (PrayerInteraction)

**Acceptance Criteria:**
- "Prayed For" tab in profile
- List of prayers I've clicked "I Prayed" on
- Shows current prayer count for each
- Can tap to view prayer details
- Optional notifications when prayers are answered

---

### Story 14: Mark Prayers Answered
⏳ **P2** - **As a user who submitted a prayer, I want to mark it as answered, so that I can share good news with those who prayed for me.**

**Why this matters:** Answered prayers encourage everyone and build faith.

**Linked to:** User-flows.md (3.8 Manage Prayer), Data-Model.md (PrayerRequest status)

**Acceptance Criteria:**
- "Mark as Answered" button on own prayers
- Optional message field for sharing update
- Visual indicator on prayer card (e.g., "✓ Answered")
- Shows in feed with answered status
- Can still be viewed but moved to separate section

---

## Safety & Moderation

### Story 15: Report Inappropriate Content
⏳ **P1** - **As a user, I want to report inappropriate content, so that Oratio remains a safe, encouraging space.**

**Why this matters:** No platform is immune to bad actors. We need user help to maintain quality.

**Linked to:** project_scope/Safety-Moderation.md

**Acceptance Criteria:**
- "Report" option on each prayer (three-dot menu)
- Simple reason selection (spam, inappropriate, hate speech, other)
- Confirmation that report was received
- No retaliation against reporters (anonymous reporting)
- Moderator review process documented

---

### Story 16: Safety Disclaimer
⏳ **P1** - **As a user, I want clear safety information, so that I understand Oratio's limits and where to get crisis help.**

**Why this matters:** We're a prayer platform, not a crisis hotline. Clear boundaries protect users and us.

**Linked to:** MVP-Scope.md (safeguarding disclaimer), project_scope/Safety-Moderation.md

**Acceptance Criteria:**
- Clear disclaimer on submit page: "Oratio is for prayer support, not crisis intervention"
- Links to real crisis resources (suicide hotline, domestic violence help, etc.)
- Visible but not intrusive
- Acknowledgment checkbox for first-time submitters

---

## Technical Quality Stories

### Story 17: Fast Loading
⏳ **P1** - **As a mobile user, I want the app to load quickly, so that I don't lose interest or get frustrated.**

**Why this matters:** 40% of users abandon sites taking more than 3 seconds to load.

**Acceptance Criteria:**
- First content visible in under 3 seconds on mobile 3G
- Interactive in under 5 seconds
- Smooth scrolling with no jank
- Works on older phones and slower networks

---

### Story 18: Installable App
⏳ **P2** - **As a mobile user, I want to install Oratio to my home screen, so that I can access it like any other app.**

**Why this matters:** App-like experience increases engagement and makes Oratio part of daily life.

**Acceptance Criteria:**
- "Add to Home Screen" prompt on mobile
- Installs with Oratio icon
- Opens in full-screen app mode (no browser chrome)
- Works offline for basic browsing
- Push notifications capability (future)

---

### Story 19: Improved Typography
⏳ **P2** - **As a user, I want clear, readable typography with distinct heading and body fonts, so that I can easily navigate and read prayer content.**

**Why this matters:** Good typography improves readability, establishes brand identity, and creates visual hierarchy.

**Acceptance Criteria:**
- Import Google Fonts (DM Sans for body, Sora for headings)
- Apply font families consistently across all components
- Ensure text is accessible with proper contrast ratios
- Maintain responsive typography scale

---

### Story 20: Enhanced Map Visualization
✅ **P2** - **As a user, I want to see prayer activity on a clean, professional map with separate base and label layers, so that I can better understand global prayer distribution.**

**Why this matters:** A well-designed map improves the visual appeal and usability of the global prayer visualization.

**Acceptance Criteria:**
- Replace current tile layer with ESRI Canvas World Dark Gray layers
- Implement separate base layer (landmass) and labels layer (city/country names)
- Set maxZoom: 7 for privacy compliance
- Configure proper map bounds and zoom controls
- Ensure markers render above label layer

---

### Story 21: Intelligent Search with Suggestions
✅ **P1** - **As a user, I want to search prayers with intelligent suggestions for cities, people, and keywords, so that I can quickly find relevant content.**

**Why this matters:** Smart search reduces friction in discovering prayers and helps users filter by location, person, or topic.

**Acceptance Criteria:**
- Search input with live suggestions dropdown
- Three suggestion types: cities, people, keywords
- Location filtering via city suggestions
- Proper dropdown positioning (sibling to search bar, not nested)
- Clear visual design with icons and counts
- URL search params for location filtering
- Location filter banner with clear option

---

### Story 22: Improved Prayer Response UX
⏳ **P3** - **As a user, I want clear feedback when I tap "I Prayed" with appropriate timing for confirmation and drawer dismissal, so that I feel my action was registered.**

**Why this matters:** Proper feedback timing creates a satisfying user experience and confirms actions were successful.

**Acceptance Criteria:**
- "I Prayed" button transitions immediately to "Prayed" state
- Confirmation screen appears after 600ms
- Drawer auto-dismisses after 2.5 seconds (total ~3.1s)
- User can close early via "Back to Feed", swipe, or overlay tap

---

### Story 23: Enhanced Profile Management
✅ **P2** - **As a user, I want easy access to edit my profile from the quick actions menu, so that I can update my information without navigating deep into settings.**

**Why this matters:** Making profile editing accessible increases the likelihood users will maintain accurate and complete profiles.

**Acceptance Criteria:**
- Add "Edit Profile" option to quick actions menu
- Ensure consistent iconography and labeling
- Link to existing profile editing functionality

---

### Story 24: Follow System for Community Building
✅ **P1** - **As a user, I want to follow other believers to see their prayers in a dedicated feed, so that I can build connections and follow specific people's prayer journeys.**

**Why this matters:** Following creates social connections, increases engagement, and personalizes the prayer feed.

**Acceptance Criteria:**
- Follow/unfollow buttons on user profiles and prayer cards
- "Following" tab in feed to filter prayers from followed users
- Follower/following counts displayed on profiles
- Tapable user profiles from feed items
- Real-time update of follow status

---

 ### Story 25: Instagram-style Profile Stats Navigation
 ✅ **P2** - **As a user, I want to tap on my profile stats (Submitted, Prayed For, Answered, Following) to see detailed pages for each, so that I can explore my prayer journey in depth.**

 **Why this matters:** Instagram's pattern of separate pages for each stat is familiar to users, scales better for large lists, and provides better search/filter capabilities than drawers.

 **Linked to:** MVP-Scope.md (User Profile & Stats), User-flows.md (3.7 Profile)

 **Acceptance Criteria:**
 - All 4 profile stats are clickable with hover animations
 - Tapping a stat navigates to a dedicated page for that category
 - Detail pages have Instagram-style layout (header with back button, hides bottom nav)
 - Submitted page: Lists user's submitted prayers with edit/delete/answered actions
 - Prayed For page: Lists prayers user prayed for with current prayer counts
 - Answered page: Lists answered prayers with celebration visuals
 - Following page: Enhanced list with search/filter capability for large following lists
 - Consistent dark blue theme (#0A1A3A) across all detail pages
 - Smooth transitions and loading states

 ---

 ### Story 26: City Label Display on Map
 ✅ **P2** - **As a user, I want to see city names on the map when zoomed in, so that I can better orient myself and understand where prayers are coming from.**

 **Why this matters:** City labels provide geographical context and help users connect prayer activity to specific locations.

 **Linked to:** MVP-Scope.md (Map visualization), User-flows.md (3.2 Explore)

 **Acceptance Criteria:**
 - Toggle button to show/hide city labels
 - Labels appear only when zoomed in (zoom ≥7) to avoid clutter
 - Subtle label styling that matches dark theme (#0A1A3A)
 - Privacy protection maintained (approximate coordinates only)
 - Labels update dynamically when zoom changes

 ---

 ## How Stories Connect to Epics

 | Story | Epic | Phase |
 |-------|------|-------|
 | 1-2 | Core Prayer Loop | 1 |
 | 3-5 | Core Prayer Loop + Map | 1-2 |
 | 6-8 | Core Prayer Loop + Security | 1 |
 | 9-10 | Core Prayer Loop | 1-2 |
 | 11-14 | User Profile & Stats | 2 |
 | 15-16 | Security & Privacy | 1 |
 | 17-18 | Performance & PWA | 1-2 |
 | 19 | Technical Foundation | 1 |
 | 20 | Map & Visualization | 1 |
 | 21 | Core Prayer Loop | 1 |
 | 22 | Core Prayer Loop | 1 |
 | 23 | User Profile & Stats | 1 |
 | 24 | Core Prayer Loop | 2 |
 | 25 | User Profile & Stats | 2 |
 | 26 | Map & Visualization | 1 |

---

## Prioritization Framework

### P1 (Critical for Launch)
- Must be working for initial public release
- Core functionality, security, privacy
- Examples: Submit prayer, "I Prayed", basic feed, privacy protection

### P2 (Important for Good Experience)
- Should be in first 3 months
- Enhances core features, improves UX
- Examples: Profile stats, filtering, translation, PWA install

### P3 (Nice-to-have)
- Can come after successful launch
- Advanced features, polish
- Examples: Advanced analytics, groups, notifications

---

## How to Add or Change Stories

1. **Identify user need** from feedback, analytics, or team insight
2. **Write story** using the format above
3. **Link to existing docs** (MVP-Scope, User-flows, etc.)
4. **Discuss with team** for priority and feasibility
5. **Add to this document** with appropriate status
6. **Create acceptance criteria** in ACCEPTANCE_CRITERIA.md

---

## For Non‑Technical Readers

**Q: What's the difference between a user story and a feature?**
A: A user story describes the problem from the user's perspective. A feature is the technical solution. We start with stories to ensure we're solving real problems.

**Q: Why so many stories for a "simple" app?**
A: Even simple apps have many touchpoints. Breaking them down helps us build incrementally and test each part thoroughly.

**Q: How do stories become working software?**
A: Each story gets broken down into technical tasks, gets designed, built, tested, and reviewed before reaching users.

**Q: Can users suggest stories?**
A: Absolutely! User feedback is the best source of new stories. We'll add feedback mechanisms in the app.

---

*Last Updated: 2026-04-18*  
*Next Review: Weekly during team meetings*