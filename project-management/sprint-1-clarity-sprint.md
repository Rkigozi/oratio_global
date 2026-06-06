# Sprint 1 — "The Clarity Sprint"

**Version:** v0.2 — Feedback Iteration
**Goal:** Make the app explain itself so testers can use it without guidance.
**Target:** In-person testing ready

---

## Stories

### KAN-001: Fix readability (font size + card contrast)

**Type:** Story
**Epic:** Core Prayer Loop
**Description:**
Current dark background with small font is hard to read (reported by tester). Increase base font size by 1-2 steps and lighten prayer card backgrounds slightly to improve contrast while preserving the dark theme atmosphere.

**Subtasks (in description):**
- [ ] Update base font size in theme/styles
- [ ] Lighten prayer card background opacity/color for better text contrast
- [ ] Verify on mobile viewport

---

### KAN-002: Fix category picker scroll on submit

**Type:** Story
**Epic:** Core Prayer Loop
**Description:**
The category dropdown on the submit prayer form is not scrollable — users can't reach categories at the bottom of the list (reported by Naomi). Fix CSS overflow to allow proper scrolling within the dropdown container.

**Subtasks (in description):**
- [ ] Identify the category dropdown component
- [ ] Fix overflow-y / max-height CSS to enable scrolling
- [ ] Verify all categories are reachable on mobile

---

### KAN-003: Add clarifying microcopy across key touchpoints

**Type:** Story
**Epic:** Core Prayer Loop
**Description:**
Users are confused about the app's purpose (Jemima: "what is the call to action?"). Add targeted copy to eliminate confusion without a tutorial. Also includes prayer guidance hint on first submit (originally from Khaled feedback).

**Touchpoints to update:**

- **Onboarding screen** → "Oratio connects people around the world through prayer. Share your needs. Pray for others. You're not alone."
- **Map pin tooltip** → "Someone in [city] needs prayer"
- **"I Prayed" button** → "Pray for this"
- **Prayer count** → "[N] people prayed for this"
- **Submit placeholder** → "Share what you'd like prayer for..."
- **Submit success** → "Your prayer is on the map and in the feed. People around the world will see it and pray."
- **Feed empty state** → "No prayers yet. Share the first one."
- **Profile > Submitted empty** → "You haven't shared a prayer need yet. When you do, they'll live here."
- **Profile > Prayed For empty** → "When you pray for someone, you'll see them here. Try the feed."
- **First submit guidance** → Dismissible hint: "Not sure what to write? Share what you'd like prayer for..."

**Subtasks (in description):**
- [ ] Update onboarding screen copy
- [ ] Update map pin tooltip copy
- [ ] Change "I Prayed" button text to "Pray for this"
- [ ] Update prayer count format to "[N] people prayed for this"
- [ ] Update submit placeholder text
- [ ] Update submit success state copy
- [ ] Add empty state messages for feed and profile tabs
- [ ] Implement prayer guidance hint on first submit
- [ ] Verify on all screen sizes

---

### KAN-004: Replace like/react with praying hands

**Type:** Story
**Epic:** Core Prayer Loop
**Description:**
Currently the prayer reaction uses a generic "like" icon (Jemima: "instead of just liking, react with praying hands"). Replace with praying hands icon to make the action feel like prayer, not social media.

**Subtasks (in description):**
- [ ] Find the reaction icon component in codebase
- [ ] Swap icon asset for praying hands
- [ ] Update any related labels/tooltips
- [ ] Verify on mobile

---

## Task

### KAN-005: Create in-person testing session kit

**Type:** Task
**Epic:** Beta Testing & Validation
**Description:**
Prepare structured materials for observed testing sessions to get high-quality signal from each tester. Deliverables are documents, not code.

**Session format:**
- ~30 min group session (6-7 testers in one room)
- Everyone uses their own phone
- Link delivered via QR code on printed sheet
- Group arrives → briefed → silent session → group debrief

**Task cards (3-4 per session):**
1. "Find a prayer about healing and pray for it"
2. "Share your own prayer request"
3. "Find a prayer from a different country"
4. "Find your prayer in the feed"

**Observation framework (what to note):**
- Where do they hesitate?
- What do they tap that isn't a button?
- What do they expect to happen but doesn't?
- What do they say spontaneously?
- Emotional reactions (confusion, calm, frustration)

**Debrief questions:**
- "What did you think this app was for?"
- "What frustrated you?"
- "What would you change first?"
- "Would you use this? Why or why not?"

**Subtasks (in description):**
- [ ] Tester availability poll — confirm date (Tues 2nd, Fri 5th, or Sat 6th June) + evening time
- [ ] Write facilitator session script with timing
- [ ] Create tester task card (QR code + 4 tasks, one A4 page)
- [ ] Build observation checklist (one page per tester)
- [ ] Write debrief questions
- [ ] Print all materials
