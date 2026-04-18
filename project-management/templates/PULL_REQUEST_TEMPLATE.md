# Oratio Pull Request Template

## Purpose
This template helps ensure consistent, high-quality code reviews and clear communication about changes.

**Before submitting:** Please complete all relevant sections below.

---

## 1. Overview

### What's Being Changed?
- [ ] **New feature** (adds user-facing functionality)
- [ ] **Bug fix** (resolves a reported issue)
- [ ] **Technical improvement** (refactoring, performance, security)
- [ ] **Documentation** (updates to docs, no code changes)
- [ ] **Other** (describe below)

### Description
Provide a clear, concise description of what this PR does and why.

**Example:** "Adds input validation to the prayer submission form using Zod schemas to prevent XSS attacks."

---

## 2. Linked Items

### User Story
Link to the user story or technical story this PR addresses:

**Story:** [Story title] (link to USER_STORIES.md#story-X or TECHNICAL_STORIES.md#story-TX)

### Related Issues
- Closes #[issue number]
- Related to #[issue number]
- Part of #[epic number]

### Design/Requirements
- [Design mockups](link) (if applicable)
- [Acceptance Criteria](link to ACCEPTANCE_CRITERIA.md#example-X)

---

## 3. Changes Made

### Files Changed
List the main files changed and briefly explain why:

```
src/features/prayers/PrayerSubmissionForm.tsx
- Added Zod schema validation
- Integrated DOMPurify for content sanitization
- Added error message display

src/lib/validation/schemas.ts
- Created prayer submission schema
- Added validation utilities
```

### Technical Decisions
Explain any significant technical decisions or trade-offs:

**Example:** "Chose Zod over Yup because it provides better TypeScript integration and we already use it elsewhere in the codebase."

---

## 4. Testing

### Manual Testing Performed
- [ ] Tested on desktop (Chrome, Firefox, Safari)
- [ ] Tested on mobile (iOS Safari, Android Chrome)
- [ ] Tested with screen reader (VoiceOver/NVDA)
- [ ] Tested keyboard navigation
- [ ] Tested error cases (offline, invalid input)
- [ ] Tested performance impact

### Automated Tests
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] All existing tests pass

**Test coverage:** [If applicable, mention coverage changes]

---

## 5. Quality Gates Checklist

### Code Quality
- [ ] Follows [Guidelines.md](../guidelines/Guidelines.md)
- [ ] No TypeScript errors (`npm run type-check` passes)
- [ ] ESLint passes (`npm run lint` passes)
- [ ] Prettier formatting applied (`npm run format`)

### Security & Privacy
- [ ] No security vulnerabilities introduced
- [ ] Input validation implemented where needed
- [ ] Privacy requirements maintained (no exact coordinates)
- [ ] No sensitive data exposed in logs/errors

### Accessibility
- [ ] Keyboard navigable
- [ ] Screen reader compatible
- [ ] Sufficient color contrast
- [ ] Focus indicators visible

### Performance
- [ ] No significant bundle size increase (>10%)
- [ ] No performance regressions
- [ ] Images optimized where applicable

---

## 6. Screenshots & Demos

### Visual Changes
Attach screenshots or screen recordings for UI changes:

**Before:** [screenshot]
**After:** [screenshot]

### Demo
[Link to deployed preview] or brief description of how to test:

**Example:** "Navigate to /submit-prayer, try submitting with invalid input to see validation messages."

---

## 7. Deployment & Migration

### Database Changes
- [ ] No database changes required
- [ ] Migration script provided
- [ ] Backward compatible

### Environment Variables
- [ ] No new environment variables needed
- [ ] Added to `.env.example`
- [ ] Documentation updated

### Breaking Changes
- [ ] No breaking changes
- [ ] Breaking changes documented
- [ ] Migration guide provided

---

## 8. Review Notes

### For Reviewers
- **Focus areas:** [Specify what you'd like reviewers to pay special attention to]
- **Known issues:** [List any known problems or limitations]
- **Questions:** [Ask specific questions you have about the implementation]

### Review Checklist for Reviewers
- [ ] Code follows project patterns and guidelines
- [ ] Logic is correct and efficient
- [ ] Error handling is appropriate
- [ ] Tests are comprehensive
- [ ] Documentation is updated
- [ ] Security considerations addressed
- [ ] Performance impact considered

---

## 9. Post‑Merge Actions

### After Merge
- [ ] Update relevant documentation
- [ ] Notify stakeholders if needed
- [ ] Update ticket status in backlog
- [ ] Deploy to staging (if automated)

### Monitoring
- [ ] Set up monitoring/alerts if needed
- [ ] Plan for performance validation
- [ ] User feedback collection plan

---

## For Non‑Technical Readers

**What is a Pull Request (PR)?**
A PR is a request to merge changes from one branch into another (usually into the main codebase). It's how developers propose, review, and discuss changes before they go live.

**How to Review a PR (for non‑developers):**
1. **Read the description** - Understand what's changing and why
2. **Check screenshots/demos** - See the visual impact
3. **Review testing section** - Ensure thorough testing was done
4. **Ask questions** - Clarify anything unclear
5. **Verify requirements** - Ensure the change meets the original need

**Common PR Statuses:**
- **Draft:** Work in progress, not ready for review
- **Open:** Ready for review
- **Changes requested:** Reviewer requested modifications
- **Approved:** Ready to merge
- **Merged:** Changes are now in the main codebase

---

## Template Usage Notes

### For Small Changes
For very small changes (typos, minor fixes), you can simplify but still complete minimum sections:
- Overview
- Changes Made
- Testing
- Quality Gates (minimum checks)

### For Large Features
For large features, consider breaking into multiple smaller PRs. Each should be independently reviewable and mergeable.

### Required for All PRs
- **Description** of what and why
- **Linked story** or issue
- **Testing** evidence
- **Quality gates** checklist

---

*Template Version: 1.0*  
*Based on Oratio Guidelines v1*