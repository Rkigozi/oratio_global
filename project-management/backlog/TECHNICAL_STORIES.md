# Oratio Backlog - Technical Stories

## What Are Technical Stories?
Technical stories describe work that needs to happen "under the hood"—things users don't see directly but that make the app secure, fast, reliable, and maintainable.

Unlike user stories ("As a user, I want..."), technical stories focus on system needs:
- **"As a developer, I need to..."** (maintainability)
- **"As a system, we must..."** (security, performance)
- **"To support [user story], we need to..."** (infrastructure)

---

## How to Read This Document

### Status Icons
- ✅ **Done** - Implemented and verified
- 🔄 **In Progress** - Currently being worked on
- ⏳ **Planned** - Scheduled for future work
- ❓ **Backlog** - Under consideration

### Priority Levels
- **P1 (Critical)** - Must fix before launch (security, critical bugs)
- **P2 (High)** - Should fix soon (performance, major tech debt)
- **P3 (Medium)** - Nice to fix (code quality, developer experience)
- **P4 (Low)** - Can wait (minor improvements, optimizations)

### Risk Level
- 🔴 **High Risk** - Could break existing functionality
- 🟡 **Medium Risk** - Some risk, manageable with testing
- 🟢 **Low Risk** - Safe changes, minimal impact

---

## Critical Technical Debt (From Audit)

### Story T1: Dependency Cleanup
✅ **P1** 🟢 - **As a development team, we need to remove 40+ unused dependencies to reduce security risk, improve performance, and make the codebase maintainable.**

**Problem:** The current `package.json` has 69 dependencies, but only about 25 are actually used. The rest are unused libraries that:
- Increase download size (slower app)
- Create security vulnerabilities (outdated packages)
- Make onboarding new developers difficult
- Cause confusion about what's actually needed

**Linked to:** `developer-audit-package.md` (Dependency Bloat), `techContext.md` (Dependency Problems)

**Acceptance Criteria:**
- Package count reduced from 69 to ~25
- No build or runtime errors after removal
- Bundle size reduced by 30%+ (measured via `npm run build`)
- All tests (when added) still pass
- Document which packages were removed and why

**Packages to Remove (Examples):**
- React DnD (drag and drop - not used)
- Recharts (charts - not implemented)
- HTML2Canvas (screenshots - why needed?)
- Input OTP (no authentication flows)
- Unused MUI Material components
- Other redundant UI libraries

---

### Story T2: Update Critical Dependencies
⏳ **P1** 🔴 - **As a system, we need to update React and other critical packages to fix security vulnerabilities and enable modern features.**

**Problem:** Key packages are 2+ major versions behind:
- React 18.3.1 → 19.2.4 (2 major versions)
- React Leaflet 4.2.1 → 5.0.0 (breaking changes)
- Lucide React 0.487.0 → 1.7.0 (API changes)
- Date-fns 3.6.0 → 4.1.0

**Linked to:** `techContext.md` (Outdated Packages), `SECURITY_FIXES.md`

**Acceptance Criteria:**
- React updated to latest stable version
- All breaking changes addressed
- No functionality regression (manual testing)
- Update done incrementally (one major package at a time)
- Rollback plan documented

**Risk Mitigation:**
1. Update React first (most critical)
2. Test thoroughly after each update
3. Keep old versions in git for comparison
4. Document breaking changes for team

---

### Story T3: Fix Privacy Violation
⏳ **P1** 🟢 - **As a system, we must never store exact user coordinates to comply with our privacy policy and protect users.**

**Problem:** Current mock data stores exact latitude/longitude, but our documentation says we won't do this. This is a critical privacy violation.

**Linked to:** `developer-audit-package.md` (Privacy Violation), `Data-Model.md` (no exact locations)

**Acceptance Criteria:**
- Remove exact coordinates from all mock data
- Update map components to use city/country only
- Add validation to prevent coordinate storage
- Update documentation to reflect compliance
- Add privacy check in CI pipeline

**Implementation:**
1. Update `src/app/data/prayer-data.ts` to use city/country only
2. Modify `world-map.tsx` to show approximate locations
3. Add validation in prayer submission form
4. Update Memory Bank with compliance status

---

### Story T4: Input Validation & XSS Protection
⏳ **P1** 🟢 - **As a system, we must validate all user input and sanitize content to prevent security vulnerabilities.**

**Problem:** Currently, user content is accepted without validation and displayed raw, creating XSS (cross-site scripting) vulnerabilities.

**Linked to:** `SECURITY_FIXES.md`, `techContext.md` (Security Issues)

**Acceptance Criteria:**
- Zod schemas for all form inputs
- DOMPurify integration for user-generated content
- Character limits enforced (e.g., 500 chars for prayers)
- Input sanitization before database storage
- Test cases for malicious input

**Implementation:**
1. Install and configure Zod for validation
2. Install DOMPurify for content sanitization
3. Update prayer submission form with validation
4. Add security tests to test suite

---

### Story T5: Implement Design Tokens
⏳ **P2** 🟢 - **As developers, we need to replace inline styles with CSS design tokens to ensure consistent styling and easier maintenance.**

**Problem:** Components use hardcoded colors, spacing, and styles throughout, making changes difficult and creating visual inconsistencies.

**Linked to:** `systemPatterns.md` (Design System Patterns), `Design-System.md`

**Acceptance Criteria:**
- CSS variables defined for all colors, spacing, typography
- All inline styles replaced with CSS classes
- Tailwind config updated to use design tokens
- Visual consistency across all components
- Design tokens documented for team reference

**Implementation:**
1. Create `src/styles/design-tokens.css`
2. Define CSS variables for colors, spacing, etc.
3. Audit components for inline styles
4. Update 10+ highest-impact components
5. Create component styling guidelines

---

### Story T6: Component Architecture Restructure
⏳ **P2** 🟡 - **As developers, we need to reorganize components using atomic design pattern to improve maintainability and reuse.**

**Problem:** Components are mixed together without clear separation, making it hard to find and reuse code.

**Linked to:** `systemPatterns.md` (Target Component Architecture)

**Acceptance Criteria:**
- Clear folder structure: `ui/`, `layout/`, `features/`
- Atomic design principles followed
- Consistent prop interfaces across components
- Component documentation (purpose, props, usage)
- Easier onboarding for new developers

**New Structure:**
```
src/components/
├── ui/           # Primitives (Button, Input, Card, etc.)
├── layout/       # Layout (Header, Footer, Grid, etc.)
└── features/     # Feature-specific (PrayerCard, MapMarker, etc.)
```

---

### Story T7: State Management Implementation
⏳ **P2** 🟡 - **As developers, we need to implement proper state management to replace the fragmented useState + localStorage approach.**

**Problem:** State is managed inconsistently with `useState`, `localStorage`, and mixed concerns, making bugs likely and features hard to add.

**Linked to:** `techContext.md` (State Management), `systemPatterns.md` (State Management Strategy)

**Acceptance Criteria:**
- Zustand implemented for global state
- React Query implemented for server state
- Clear separation: UI state vs global state vs server state
- localStorage used only for UI preferences (not data)
- All state transitions properly typed

**Implementation:**
1. Install and configure Zustand
2. Install and configure React Query
3. Migrate critical state (user profile, prayer feed)
4. Add state persistence for offline support
5. Create state management guidelines

---

### Story T8: Testing Framework Setup
⏳ **P2** 🟢 - **As a development team, we need to implement automated testing to catch bugs early and ensure reliability.**

**Problem:** No tests exist currently, making regression likely and quality hard to measure.

**Linked to:** `guidelines/TESTING_STRATEGY.md`, `techContext.md` (Testing)

**Acceptance Criteria:**
- Jest + React Testing Library installed and configured
- Unit tests for critical utilities and hooks
- Integration tests for core user flows
- CI pipeline runs tests automatically
- Test coverage > 80% for critical paths

**Implementation:**
1. Install Jest, React Testing Library, testing utilities
2. Configure test environment and scripts
3. Write tests for: validation logic, utility functions, critical components
4. Add test coverage reporting
5. Integrate with GitHub Actions

---

### Story T9: Performance Optimization
⏳ **P2** 🟡 - **As a system, we need to implement pagination and performance optimizations to handle real user data.**

**Problem:** All prayers load at once (720KB bundle), which won't scale and creates poor user experience.

**Linked to:** `PERFORMANCE_CHECKLIST.md`, `techContext.md` (Performance Issues)

**Acceptance Criteria:**
- Prayer feed paginated (infinite scroll or load-more)
- Bundle size reduced to < 500KB gzipped
- Code splitting implemented (route-based)
- Image optimization (WebP format, lazy loading)
- Lighthouse performance score > 90

**Implementation:**
1. Implement pagination API support
2. Add infinite scroll to prayer feed
3. Analyze bundle with `vite-bundle-analyzer`
4. Implement route-based code splitting
5. Optimize images and assets

---

### Story T10: Error Handling & Monitoring
⏳ **P3** 🟢 - **As developers, we need to implement proper error handling and monitoring to understand and fix issues quickly.**

**Problem:** Empty catch blocks swallow errors, no error boundaries exist, and we have no visibility into production issues.

**Linked to:** `systemPatterns.md` (Error Handling Patterns)

**Acceptance Criteria:**
- React Error Boundaries for graceful failures
- Toast notifications (Sonner) for user feedback
- Centralized error logging
- Monitoring setup (Sentry or similar)
- Error tracking for critical user flows

**Implementation:**
1. Install and configure Sonner for toasts
2. Implement Error Boundary components
3. Set up error logging service
4. Create error handling guidelines
5. Add error tracking to CI/CD

---

### Story T11: PWA Setup
⏳ **P2** 🟢 - **As a system, we need to implement Progressive Web App capabilities for mobile app-like experience.**

**Problem:** The app is currently a basic web app without offline capability or installability.

**Linked to:** `PWA_SETUP.md`, `techContext.md` (PWA Requirements)

**Acceptance Criteria:**
- Web App Manifest with proper icons
- Service Worker for offline capability
- Install prompt on mobile devices
- Works offline for basic browsing
- Lighthouse PWA score > 90

**Implementation:**
1. Create `manifest.json` with icons
2. Implement service worker for caching
3. Update `index.html` with PWA meta tags
4. Test installability on Android/iOS
5. Add offline fallback pages

---

### Story T12: CI/CD Pipeline
⏳ **P3** 🟢 - **As a development team, we need automated deployment to ensure reliable, consistent releases.**

**Problem:** Manual deployments are error-prone and slow down development.

**Linked to:** `techContext.md` (Deployment)

**Acceptance Criteria:**
- GitHub Actions workflow for CI/CD
- Automated tests run on every PR
- Automated deployment to staging on merge
- Manual approval for production deployment
- Deployment documentation for team

**Implementation:**
1. Set up GitHub Actions workflows
2. Configure test automation
3. Set up Vercel/Netlify integration
4. Create deployment checklists
5. Document rollback procedures

---

### Story T13: Instagram-style Profile Navigation Architecture
✅ **P2** 🟢 - **As developers, we need to implement nested routing for profile stats to provide Instagram-style separate pages with better scalability and UX.**

**Problem:** Current profile uses tabs and drawers which don't scale for large following lists and lack search/filter capability. Instagram's pattern of separate pages is more familiar and functional.

**Acceptance Criteria:**
- Update routes.ts to add nested routes under `/profile` (`/profile/submitted`, `/profile/prayed`, `/profile/answered`, `/profile/following`)
- Create DetailLayout component that hides bottom nav for detail pages
- Create four new page components with consistent styling
- Extract shared data helpers to profile-data.ts for consistent data access
- Implement search/filter for Following page
- Update profile.tsx to make all stats clickable and remove current tabs

**Implementation:**
1. Update routing configuration (routes.ts) with nested routes
2. Create DetailLayout component (hides bottom nav, adds back button)
3. Create SubmittedPage, PrayedForPage, AnsweredPage, FollowingPage
4. Extract localStorage helpers to profile-data.ts
5. Update profile.tsx navigation
6. Add search/filter to Following page (reuse feed search components)

---

## Technical Stories by Phase

### Phase 1 (Weeks 1-3) - Foundation
- T1: Dependency Cleanup (P1)
- T2: Update Critical Dependencies (P1)
- T3: Fix Privacy Violation (P1)
- T4: Input Validation & XSS Protection (P1)
- T5: Implement Design Tokens (P2)
- T8: Testing Framework Setup (P2)
- T11: PWA Setup (P2)

### Phase 2 (Weeks 4-6) - Architecture
- T6: Component Architecture Restructure (P2)
- T7: State Management Implementation (P2)
- T9: Performance Optimization (P2)
- T10: Error Handling & Monitoring (P3)
- T13: Instagram-style Profile Navigation Architecture (P2)

### Phase 3 (Weeks 7-9) - Production
- T12: CI/CD Pipeline (P3)
- Remaining P3/P4 technical debt
- Monitoring and analytics setup

---

## Risk Assessment Summary

| Story | Risk | Mitigation Strategy |
|-------|------|-------------------|
| T2: Update Dependencies | 🔴 High | Update one package at a time, extensive testing, rollback plan |
| T6: Component Restructure | 🟡 Medium | Keep old structure during transition, update incrementally |
| T7: State Management | 🟡 Medium | Implement alongside existing code, gradual migration |
| T9: Performance Optimization | 🟡 Medium | Test with real data, implement gradually |
| T13: Instagram-style Profile Navigation Architecture | 🟢 Low | Incremental updates, reuse existing patterns, thorough testing |
| All Others | 🟢 Low | Standard development practices, testing, code review |

---

## Success Metrics for Technical Stories

| Metric | Target | Measurement |
|--------|--------|-------------|
| Bundle Size | < 500KB gzipped | `npm run build -- --report` |
| Test Coverage | > 80% critical paths | Jest coverage reports |
| Load Time | < 3s mobile 3G | Lighthouse, WebPageTest |
| Dependency Count | ~25 packages | `package.json` audit |
| Error Rate | < 0.1% of sessions | Error monitoring (Sentry) |
| PWA Score | > 90 | Lighthouse PWA audit |

---

## For Non‑Technical Readers

**Q: Why do we need technical stories if users don't see them?**
A: Think of it like maintaining a car. Users don't see the oil changes or brake inspections, but without them, the car breaks down. Technical stories keep the app running smoothly, securely, and reliably.

**Q: How do technical stories relate to user stories?**
A: Technical stories enable user stories. For example, "Submit Prayer" (user story) needs "Input Validation" (technical story) to work safely.

**Q: Who prioritizes technical stories?**
A: Developers and product managers work together. Security and critical bugs get top priority, then performance, then code quality improvements.

**Q: Can we skip technical stories to launch faster?**
A: We can defer some, but skipping critical ones (security, privacy) creates serious risks. Our approach: fix critical issues first, launch, then improve.

---

## How to Add New Technical Stories

1. **Identify need** from: bug reports, performance metrics, security audits, developer pain points
2. **Assess impact** on: users, security, performance, maintainability
3. **Write story** using format above
4. **Estimate effort** and risk
5. **Prioritize** with team
6. **Add to backlog** with appropriate phase

---

*Last Updated: 2026-04-18*  
*Next Review: Weekly tech team meeting*