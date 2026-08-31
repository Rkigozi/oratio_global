# Oratio Backlog - Acceptance Criteria

## What Are Acceptance Criteria?
Acceptance Criteria (AC) are the specific conditions that must be met for a user story or technical story to be considered "done." They define what success looks like from both user and technical perspectives.

**Think of AC as:**
- **The checklist** for developers building a feature
- **The test plan** for QA testing it
- **The agreement** between product, design, and development on what "done" means

---

## AC Template (For All Stories)

### Basic Template
```
**Story:** [Link to story in USER_STORIES.md or TECHNICAL_STORIES.md]

**Primary AC (User Perspective):**
- [ ] **Given** [initial context/state]
- [ ] **When** [user takes action]
- [ ] **Then** [expected outcome]
- [ ] **And** [additional outcomes]

**Technical AC (System Requirements):**
- [ ] [Technical requirement 1]
- [ ] [Technical requirement 2]
- [ ] [Technical requirement 3]

**Quality Gates:**
- [ ] Code reviewed by at least one other developer
- [ ] All tests pass (unit, integration as applicable)
- [ ] No security or privacy violations
- [ ] Accessibility requirements met
- [ ] Performance benchmarks met
```

### Expanded Template (For Complex Stories)
```
**Story:** [Story title and link]

**User Flow AC:**
1. **Scenario 1:** [Common case]
   - Given [context]
   - When [action]
   - Then [result]
2. **Scenario 2:** [Edge case]
   - Given [different context]
   - When [same/different action]
   - Then [appropriate result]

**Technical Implementation AC:**
- [ ] [Specific technical requirement]
- [ ] [Data validation rule]
- [ ] [Error handling behavior]
- [ ] [Performance requirement]

**Design & UX AC:**
- [ ] [Visual design matches mockups]
- [ ] [Responsive behavior]
- [ ] [Loading states]
- [ ] [Error states]
- [ ] [Accessibility requirements]

**Quality Gates:** [Same as basic template]
```

---

## Example AC for Common Stories

### Example 1: Submit Prayer Request
**Story:** "As a user, I want to submit a prayer request with a message and location, so that others can pray for me." (Story 6 in USER_STORIES.md)

**Primary AC (User Perspective):**
- [ ] **Given** I'm on the Submit Prayer screen
- [ ] **When** I enter a message (1-500 characters) and select a location
- [ ] **Then** I can tap "Submit" and see a success confirmation
- [ ] **And** my prayer appears in the feed with my selected location (city/country only)
- [ ] **And** I have the option to submit anonymously

**Technical AC:**
- [ ] Message length validated (1-500 characters)
- [ ] Location stored as city/country only (no coordinates)
- [ ] Database record created with correct user association
- [ ] Anonymous flag stored if selected
- [ ] Input sanitized to prevent XSS
- [ ] API returns appropriate HTTP status codes

**Error Handling AC:**
- [ ] **Given** I submit without a message
- [ ] **When** I tap "Submit"
- [ ] **Then** I see "Message is required" error
- [ ] **And** the submit button is disabled

- [ ] **Given** My internet connection drops
- [ ] **When** I try to submit
- [ ] **Then** I see "Connection lost" error
- [ ] **And** my message is saved locally for retry

**Quality Gates:**
- [ ] Code reviewed by at least one other developer
- [ ] Unit tests for validation logic
- [ ] Integration test for submission flow
- [ ] No PII (personally identifiable information) exposed
- [ ] WCAG 2.1 AA compliance for form
- [ ] Loads in < 2 seconds on mobile

---

### Example 2: "I Prayed" Interaction
**Story:** "As a user, I want to tap 'I Prayed' on a prayer request, so that the requester knows they're being supported." (Story 9 in USER_STORIES.md)

**Primary AC:**
- [ ] **Given** I'm viewing a prayer in the feed
- [ ] **When** I tap the "I Prayed" button
- [ ] **Then** the prayer count increments immediately
- [ ] **And** the button changes state (visual feedback)
- [ ] **And** I cannot tap it again (prevent double-counting)

**Technical AC:**
- [ ] API call to increment prayer count
- [ ] Database transaction to prevent race conditions
- [ ] UserID associated with prayer interaction
- [ ] One interaction per user per prayer enforced
- [ ] Count cached appropriately for performance

**Edge Cases AC:**
- [ ] **Given** I already prayed for this prayer
- [ ] **When** I tap "I Prayed" again
- [ ] **Then** nothing happens (no duplicate count)
- [ ] **And** I see appropriate feedback ("Already prayed")

- [ ] **Given** I'm offline
- [ ] **When** I tap "I Prayed"
- [ ] **Then** action is queued for when online
- [ ] **And** I see "Will pray when connected" feedback

**Quality Gates:**
- [ ] Code reviewed
- [ ] Unit tests for interaction logic
- [ ] Integration test for prayer flow
- [ ] No security vulnerabilities in API endpoint
- [ ] Accessible via keyboard and screen readers
- [ ] Works on slow networks (graceful degradation)

---

### Example 3: Dependency Cleanup (Technical Story)
**Story:** "As a development team, we need to remove 40+ unused dependencies..." (Story T1 in TECHNICAL_STORIES.md)

**Technical AC:**
- [ ] Package count reduced from 69 to ~25
- [ ] `npm install` completes without errors
- [ ] `npm run build` produces working bundle
- [ ] `npm run dev` starts development server
- [ ] All existing functionality works (manual testing)
- [ ] Bundle size reduced by 30%+ (measured)

**Validation AC:**
- [ ] **Given** the cleaned package.json
- [ ] **When** I run the app
- [ ] **Then** all features work as before
- [ ] **And** no console errors about missing dependencies

**Documentation AC:**
- [ ] Removed packages listed with reasons
- [ ] Remaining packages documented with purpose
- [ ] Update instructions for new developers
- [ ] Memory Bank updated with changes

**Quality Gates:**
- [ ] Code reviewed by team
- [ ] No security vulnerabilities in remaining packages
- [ ] Build process still works in CI
- [ ] Documentation updated

---

## AC Categories & Checklists

### Security AC Checklist
- [ ] Input validation prevents SQL injection
- [ ] Content sanitization prevents XSS
- [ ] Authentication/authorization checks in place
- [ ] No sensitive data exposed in logs/errors
- [ ] HTTPS enforced in production
- [ ] Privacy requirements met (no exact locations)

### Privacy AC Checklist
- [ ] Only necessary data collected
- [ ] No exact coordinates stored
- [ ] Anonymous option available
- [ ] Data retention policy followed
- [ ] User data not shared without consent
- [ ] Clear privacy policy linked

### Accessibility AC Checklist
- [ ] Keyboard navigable (Tab, Enter, Space)
- [ ] Screen reader announcements appropriate
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Focus indicators visible
- [ ] ARIA labels where needed
- [ ] Text resizing doesn't break layout

### Performance AC Checklist
- [ ] Loads in < 3s on mobile 3G
- [ ] Time to Interactive < 5s
- [ ] No layout shifts (CLS < 0.1)
- [ ] Bundle size < 500KB gzipped
- [ ] Images optimized (WebP, lazy loading)
- [ ] API responses cached appropriately

### Mobile/Responsive AC Checklist
- [ ] Works on iOS Safari
- [ ] Works on Android Chrome
- [ ] Touch targets ≥ 44px
- [ ] No horizontal scrolling on mobile
- [ ] Keyboard doesn't cover inputs
- [ ] Installable as PWA (where applicable)

---

## AC Writing Guidelines

### Do's
- ✅ **Be specific:** "Message must be 1-500 characters" not "Message should be reasonable length"
- ✅ **Testable:** Each AC should be verifiable with a clear pass/fail
- ✅ **User-focused:** Describe outcomes from user perspective
- ✅ **Complete:** Cover normal case, edge cases, error cases
- ✅ **Consistent:** Use same terminology as user stories

### Don'ts
- ❌ **Vague:** "Should work well" (how do we measure?)
- ❌ **Implementation-specific:** "Use React Query for caching" (focus on what, not how)
- ❌ **Too technical for user AC:** Keep user AC in user language
- ❌ **Missing edge cases:** Consider empty states, errors, boundaries

### Good vs Bad Examples

**Bad:** "The app should be fast"
**Good:** "Prayer feed loads in < 2 seconds on mobile 3G connection"

**Bad:** "Users can submit prayers"
**Good:** "Given I'm logged in, when I fill the prayer form and tap submit, then I see a success message and my prayer appears in the feed"

**Bad:** "Handle errors gracefully"
**Good:** "When network connection drops during prayer submission, show 'Connection lost' message and save draft locally for retry"

---

## AC Review Process

### Before Development
1. **Product Manager** drafts initial AC based on user needs
2. **Designer** adds UX/UI requirements
3. **Developer** adds technical feasibility and edge cases
4. **QA** adds testability considerations
5. **Team review** ensures AC are complete and clear

### During Development
1. **Developer** references AC while building
2. **Updates AC** if discoveries require changes
3. **Flags ambiguities** for team discussion

### Before Completion
1. **Developer** verifies all AC are met
2. **QA** tests against AC
3. **Product Manager** validates from user perspective
4. **Team signs off** when all AC pass

---

## AC Templates for Common Patterns

### Form Submission Template
```
**Primary AC:**
- [ ] **Given** I'm on the [Form Name] form
- [ ] **When** I fill all required fields correctly
- [ ] **Then** I can submit the form
- [ ] **And** I see [Success Message]
- [ ] **And** I'm redirected to [Next Screen]

**Validation AC:**
- [ ] Required fields validated
- [ ] Format validation (email, phone, etc.) where applicable
- [ ] Character limits enforced
- [ ] Real-time validation feedback

**Error AC:**
- [ ] **Given** I leave a required field empty
- [ ] **When** I try to submit
- [ ] **Then** I see specific error for that field
- [ ] **And** submit button remains disabled
```

### List/Feed Template
```
**Primary AC:**
- [ ] **Given** I navigate to [Feed Name]
- [ ] **When** the page loads
- [ ] **Then** I see [X] items initially
- [ ] **And** I can scroll to load more

**Empty State AC:**
- [ ] **Given** there are no items
- [ ] **When** I view the feed
- [ ] **Then** I see helpful empty state message
- [ ] **And** call to action to create first item

**Performance AC:**
- [ ] Loads in < 2 seconds
- [ ] Infinite scroll smooth (no jank)
- [ ] Images lazy load
- [ ] Works offline (cached items)
```

### Detail View Template
```
**Primary AC:**
- [ ] **Given** I tap an item in a list
- [ ] **When** the detail view opens
- [ ] **Then** I see complete information about that item
- [ ] **And** I can perform relevant actions

**Navigation AC:**
- [ ] Browser back button works
- [ ] Deep linking works (shareable URL)
- [ ] Swipe gestures on mobile
- [ ] Accessible via screen reader
```

---

## For Non‑Technical Readers

**Q: Why so much detail in AC?**
A: Clear AC prevent misunderstandings. If we say "fast," you might think 1 second, developer might think 5 seconds. AC make expectations explicit.

**Q: Who writes AC?**
A: Everyone contributes! Product focuses on user needs, design on UX, development on technical feasibility, QA on testability.

**Q: Can AC change during development?**
A: Yes, but changes should be discussed with the whole team. We document why AC changed.

**Q: How do AC help users?**
A: Good AC mean features work correctly, handle edge cases, and provide good UX—all things users appreciate even if they don't see the AC.

**Q: What if a story has no AC?**
A: Don't start development! Without AC, we don't know what "done" looks like. Always write AC first.

---

## AC Repository

This document contains templates and examples. Actual AC for specific stories should be:

1. **Written in the story ticket** (when using issue tracking)
2. **Referenced from this document** (using templates)
3. **Updated as needed** with version history

For Phase 1, we'll use this markdown approach. Later, we may migrate to a dedicated issue tracking system.

---

*Last Updated: 2026-04-18*  
*Next Review: Before each development sprint*