# Acceptance Criteria Template

## How to Use This Template
Copy this template for each new user story or technical story. Fill in the bracketed `[ ]` sections with specific details.

**Save as:** `AC-[Story-Number]-[Short-Description].md` (e.g., `AC-6-Submit-Prayer.md`)

---

# Acceptance Criteria: [Story Title]

**Story:** [Story number and title from USER_STORIES.md or TECHNICAL_STORIES.md]  
**Priority:** [P1/P2/P3]  
**Phase:** [1/2/3]  
**Estimated Effort:** [XS/S/M/L/XL]  
**Assigned To:** [Team member]  
**Due Date:** [Date]

---

## 1. Story Context

### Problem Statement
[What problem are we solving? Why does this matter to users?]

**User quote (if available):** "[What users have said about this problem]"

### Success Definition
[What does success look like for users? How will we measure it?]

**Success metrics:**
- [Metric 1]: [Target value]
- [Metric 2]: [Target value]

---

## 2. User Acceptance Criteria

### Primary User Flow
**Scenario:** [Most common user path]

- [ ] **Given** [starting condition/context]
- [ ] **When** [user takes action]
- [ ] **Then** [expected outcome]
- [ ] **And** [additional outcomes]

**Example:**
- [ ] **Given** I'm on the prayer submission screen
- [ ] **When** I enter a valid message and location
- [ ] **Then** I can tap "Submit"
- [ ] **And** I see a success confirmation
- [ ] **And** my prayer appears in the feed

### Alternative Flows
**Scenario 2:** [Less common but important path]

- [ ] **Given** [different context]
- [ ] **When** [same/different action]
- [ ] **Then** [appropriate outcome]

**Scenario 3:** [Edge case]

- [ ] **Given** [edge case context]
- [ ] **When** [action]
- [ ] **Then** [handled appropriately]

---

## 3. Technical Implementation Criteria

### Functional Requirements
- [ ] [Specific technical requirement 1]
- [ ] [Specific technical requirement 2]
- [ ] [Specific technical requirement 3]

**Examples:**
- [ ] API endpoint returns appropriate HTTP status codes
- [ ] Database constraints enforce data integrity
- [ ] Input validation prevents malicious content

### Non-Functional Requirements
- [ ] **Performance:** [Loads in < X seconds, handles Y concurrent users]
- [ ] **Security:** [Input validation, authentication, data protection]
- [ ] **Accessibility:** [WCAG 2.1 AA compliance]
- [ ] **Reliability:** [Error rate < X%, availability > Y%]

---

## 4. Design & UX Criteria

### Visual Design
- [ ] Matches design mockups ([link])
- [ ] Responsive across breakpoints (mobile, tablet, desktop)
- [ ] Consistent with Oratio design system
- [ ] Loading states implemented
- [ ] Error states designed and implemented

### User Experience
- [ ] Intuitive navigation
- [ ] Clear feedback for user actions
- [ ] Helpful error messages
- [ ] Appropriate defaults
- [ ] Keyboard navigation support

### Accessibility
- [ ] Screen reader compatible
- [ ] Keyboard navigable (Tab, Enter, Space)
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Focus indicators visible
- [ ] ARIA labels where needed

---

## 5. Error Handling & Edge Cases

### Common Errors
**Error 1:** [Description]

- [ ] **Given** [error condition occurs]
- [ ] **When** [user takes action]
- [ ] **Then** [user sees appropriate error message]
- [ ] **And** [system recovers appropriately]

**Error 2:** [Description]
- [ ] [Same format]

### Edge Cases
**Edge Case 1:** [Description]

- [ ] **Given** [edge case condition]
- [ ] **When** [user interacts]
- [ ] **Then** [system handles gracefully]

**Examples:**
- Empty state (no data)
- Slow network connection
- Offline mode
- Extremely long input
- Special characters/unicode

---

## 6. Testing Requirements

### Manual Testing Checklist
- [ ] Test on desktop (Chrome, Firefox, Safari)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Test with screen reader
- [ ] Test keyboard navigation
- [ ] Test error scenarios
- [ ] Test performance under load

### Automated Testing
- [ ] Unit tests for business logic
- [ ] Integration tests for user flows
- [ ] E2E tests for critical paths
- [ ] Accessibility tests
- [ ] Performance tests

**Test coverage target:** [X]% for new code

---

## 7. Data & Privacy Requirements

### Data Collection
- [ ] Only necessary data collected
- [ ] Data retention policy followed
- [ ] User consent obtained where required
- [ ] Clear privacy notice provided

### Privacy Protection
- [ ] No personally identifiable information (PII) exposed
- [ ] No exact coordinates stored (for location data)
- [ ] Data anonymization where appropriate
- [ ] Secure data transmission (HTTPS)

### Compliance
- [ ] GDPR considerations addressed (if applicable)
- [ ] CCPA considerations addressed (if applicable)
- [ ] Other regulatory requirements met

---

## 8. Performance Benchmarks

### Load Time Targets
- [ ] First Contentful Paint: < [X] seconds
- [ ] Time to Interactive: < [X] seconds
- [ ] Largest Contentful Paint: < [X] seconds

### Resource Usage
- [ ] Bundle size increase: < [X] KB
- [ ] Memory usage: < [X] MB
- [ ] CPU usage: < [X]% on target devices

### Scalability
- [ ] Handles [X] concurrent users
- [ ] API response time: < [X] ms
- [ ] Database query performance: < [X] ms

---

## 9. Deployment & Operations

### Deployment Requirements
- [ ] No breaking changes to existing functionality
- [ ] Database migrations (if any) are backward compatible
- [ ] Environment variables documented
- [ ] Configuration changes documented

### Monitoring & Alerting
- [ ] Key metrics tracked ([list metrics])
- [ ] Error monitoring configured
- [ ] Performance monitoring configured
- [ ] Alert thresholds set

### Rollback Plan
- [ ] Rollback procedure documented
- [ ] Data migration reversibility considered
- [ ] User impact minimized during rollback

---

## 10. Documentation

### User Documentation
- [ ] Help text within UI
- [ ] Tooltips where helpful
- [ ] FAQ entry if needed
- [ ] Tutorial/walkthrough if complex

### Technical Documentation
- [ ] Code comments for complex logic
- [ ] API documentation updated
- [ ] Database schema documented
- [ ] Deployment instructions updated

### Team Documentation
- [ ] Story added to backlog with status
- [ ] Decisions documented in Memory Bank
- [ ] Lessons learned captured

---

## 11. Definition of Done (Final Checklist)

### Code Complete
- [ ] All AC implemented
- [ ] Code reviewed and approved
- [ ] Tests written and passing
- [ ] No known bugs (or bugs documented)

### Quality Verified
- [ ] Security review completed
- [ ] Accessibility audit completed
- [ ] Performance benchmarks met
- [ ] UX review completed

### Ready for Users
- [ ] Deployed to staging
- [ ] User acceptance testing passed
- [ ] Stakeholder sign-off obtained
- [ ] Release plan confirmed

---

## 12. Notes & Decisions

### Design Decisions
[Any important design decisions made during specification]

**Example:** "Chose modal over separate page for prayer submission to maintain context."

### Technical Decisions
[Any important technical decisions]

**Example:** "Using React Query for data fetching to handle caching and background updates."

### Trade-offs & Limitations
[Any compromises or limitations]

**Example:** "Initial version doesn't support image uploads to keep MVP simple."

---

## 13. Review & Approval

### Reviewers
- **Product:** [Name] - [Date]
- **Design:** [Name] - [Date]
- **Development:** [Name] - [Date]
- **QA:** [Name] - [Date]

### Approval Sign-off
- [ ] **Product Owner:** [Signature/Date]
- [ ] **Tech Lead:** [Signature/Date]
- [ ] **Design Lead:** [Signature/Date]

---

## For Non‑Technical Readers

### What Each Section Means
- **User Acceptance Criteria:** What users should be able to do
- **Technical Criteria:** What the system needs to do internally
- **Design Criteria:** How it should look and feel
- **Testing Requirements:** How we'll verify it works
- **Performance Benchmarks:** How fast/responsive it should be

### How to Provide Input
1. **Focus on User Criteria:** Are we solving the right problem?
2. **Review Design Criteria:** Does the proposed solution feel intuitive?
3. **Consider Edge Cases:** What unusual situations should we handle?
4. **Check Documentation:** Will users understand how to use this?

### Questions to Ask
- "Will users understand how to do this without instructions?"
- "What could go wrong, and how do we handle it?"
- "How will we know if this is successful?"
- "Are there any privacy or security concerns?"

---

## Template Version History

- **v1.0 (2026-04-18):** Initial template for Oratio Phase 0
- **Updates:** This template will evolve based on team feedback

---

*Copy this template for each new story. Save in `project-management/acceptance-criteria/` folder.*