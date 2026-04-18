# Oratio Backlog - Epics

## What Are Epics?
Epics are big themes of work that deliver meaningful value to users. Think of them as chapters in a book—each epic tells part of Oratio's story. They help us organize work into logical groups.

---

## Epic 1: Core Prayer Loop
**The Heartbeat of Oratio**

**Goal:** Enable users to submit prayer requests, see others' prayers, and respond with "I Prayed."

**Why This Matters:** This is the main reason people come to Oratio. It's the basic give-and-take: share your need, support others in theirs.

**What Users Can Do:**
- Submit a prayer request with a message and location
- Browse a feed of prayer requests from around the world
- Tap "I Prayed" to show support for someone's request
- Filter prayers by category (healing, family, provision, etc.)

**Success Looks Like:**
- 10% of visitors submit a prayer
- 30% of visitors click "I Prayed" on at least one prayer
- Users return weekly to check on prayers they've supported

---

## Epic 2: Map & Visualization
**Seeing the Global Prayer Community**

**Goal:** Show prayer activity on an interactive world map to help users feel connected to a worldwide community.

**Why This Matters:** The map makes the invisible visible—you can literally see prayers happening around the globe. It creates a sense of being part of something bigger.

**What Users Can Do:**
- See prayer activity displayed on a world map
- Tap a location to see prayers from that area
- Understand where prayer needs are concentrated
- Explore different regions without revealing exact individual locations

**Privacy Protection:** The map shows city/country level only—never exact addresses or coordinates.

**Success Looks Like:**
- 40% of users interact with the map weekly
- Users spend 2+ minutes exploring the map per session
- Positive feedback about feeling connected to global community

---

## Epic 3: User Profile & Stats
**Your Prayer Journey**

**Goal:** Help users track their prayer journey and see their impact.

**Why This Matters:** People want to see their own story—what they've asked for, how they've helped others, and how prayers have been answered.

**What Users Can Do:**
- See how many prayers they've submitted
- See how many prayers they've prayed for
- Mark their own prayers as "answered" to share good news
- Choose a profile icon and optional display name
- View their prayer activity over time

**Success Looks Like:**
- 25% of users view their profile weekly
- Users mark prayers as "answered" when appropriate
- Positive feedback about feeling encouraged by seeing their impact

---

## Epic 4: Security & Privacy
**A Safe, Trustworthy Space**

**Goal:** Protect user data, ensure safe interactions, and maintain trust.

**Why This Matters:** People share deeply personal things in prayers. We must protect their privacy and create a safe environment free from abuse.

**What We're Doing:**
- Never storing exact locations—only city and country
- Providing anonymous submission option for sensitive requests
- Filtering inappropriate content
- Adding clear safety disclaimers (this is not crisis support)
- Validating all user input to prevent malicious content

**Success Looks Like:**
- Zero privacy violations
- Less than 1% of content needs moderation
- Positive user feedback about feeling safe
- No security incidents or data breaches

---

## Epic 5: Performance & PWA
**Fast, Reliable, App‑Like Experience**

**Goal:** Deliver a fast, reliable experience that works well on mobile and can be installed like an app.

**Why This Matters:** Slow apps lose users. Mobile users expect app‑like experiences. People with poor internet should still be able to pray.

**What Users Experience:**
- App loads in under 3 seconds on mobile
- Can install Oratio to their home screen (like any app)
- Basic functionality works even without internet
- Smooth scrolling and fast interactions

**Technical Improvements:**
- Optimizing images and code for speed
- Adding offline capability for browsing prayers
- Making the app installable as a Progressive Web App (PWA)

**Success Looks Like:**
- < 3 second load time on mobile 3G
- 50% of mobile users install as a PWA
- Positive feedback about speed and reliability

---

## Epic 6: Technical Foundation
**Building on Solid Ground**

**Goal:** Clean up the codebase, remove unused parts, and establish a maintainable foundation.

**Why This Matters:** Even though users don't see this directly, a clean codebase means fewer bugs, faster new features, and better security. It's like maintaining the engine of a car—essential for a smooth ride.

**What We're Doing:**
- Removing 40+ unused dependencies (cleaning up the "clutter")
- Replacing inconsistent styles with a unified design system
- Setting up automated testing to catch bugs
- Creating reliable deployment processes

**Success Looks Like:**
- 30% smaller app size (faster downloads)
- Fewer bugs reaching users
- New features can be added 2x faster
- Developers can onboard quickly

---

## How Epics Relate to Development Phases

| Epic | Phase 1 (3 weeks) | Phase 2 (3 weeks) | Phase 3 (3 weeks) |
|------|-------------------|-------------------|-------------------|
| **Core Prayer Loop** | Basic version with sample data | Connect to real database | Add advanced features |
| **Map & Visualization** | Map with sample data | Real prayer locations | Performance optimizations |
| **User Profile & Stats** | Basic profile display | Real user data | Advanced statistics |
| **Security & Privacy** | Basic protections | Full moderation system | Advanced security features |
| **Performance & PWA** | Speed improvements | Offline capability | Advanced PWA features |
| **Technical Foundation** | Cleanup & testing | Architecture improvements | Monitoring & scaling |

---

## For Non‑Technical Readers

**Common Questions Answered:**

**Q: Why do we need epics? Can't we just build features?**
A: Epics help us see the big picture. They ensure we're building the right things in the right order, and that all the pieces fit together to create a complete experience.

**Q: How long does an epic take?**
A: Most epics span multiple development phases (3 weeks each). Some parts come early, some later, based on what users need most.

**Q: Who decides what's in an epic?**
A: Product managers, designers, and developers work together, always starting from user needs documented in our scope documents.

**Q: Can epics change?**
A: Yes! As we learn from users, we may adjust epics. That's why we review them regularly.

---

## Success Metrics Summary

| Epic | Key Metric | Target |
|------|------------|--------|
| Core Prayer Loop | Prayer submission rate | 10% of visitors |
| Core Prayer Loop | "I Prayed" interaction rate | 30% of visitors |
| Map & Visualization | Weekly map interaction | 40% of users |
| User Profile & Stats | Weekly profile views | 25% of users |
| Security & Privacy | Content flag rate | < 1% |
| Performance & PWA | Mobile load time | < 3 seconds |
| Technical Foundation | Bug rate | < 0.5% of users affected |

---

## Next Steps

1. **Phase 1 (Starting Now):** Focus on Technical Foundation, Security & Privacy basics, and Core Prayer Loop with improved performance
2. **Review After Phase 1:** Check metrics, get user feedback, adjust priorities
3. **Phase 2:** Begin backend integration, real map data, user profiles
4. **Phase 3:** Polish, scale, and prepare for public launch

This backlog will be updated after each phase based on what we learn from real users.

*Last Updated: 2026-04-18*  
*Next Review: After Phase 1 Completion (approx. 3 weeks)*