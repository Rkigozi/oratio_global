# Phase 1: Foundation Cleanup (Weeks 1-3)

## Overview

**Goal**: Make the Oratio codebase production-ready before backend integration. Fix critical technical debt, security issues, and performance problems.

**Timeline**: 3 weeks (Weeks 1-3 of 9-week roadmap)
**Status**: Ready to start
**Priority**: Critical - must complete before Phase 2

## Success Criteria

### **Phase 1 Complete When:**

- [ ] Dependencies reduced from 69 to ~25 essential packages
- [ ] All inline styles replaced with CSS design tokens
- [ ] Privacy violation fixed (no exact coordinates stored)
- [ ] Basic testing framework implemented
- [ ] Performance improvements (pagination added)
- [ ] Security vulnerabilities addressed (input validation, XSS protection)

## Week-by-Week Breakdown

### **Week 1: Dependency & Package Management**

**Focus**: Clean up the bloated dependency tree and update critical packages

#### **Epic 1: Dependency Audit & Cleanup**

**Priority**: Critical
**Estimated Effort**: 8-12 hours

**Tasks:**

1. **Audit package.json** (2 hours)
   - Identify all 69 current dependencies
   - Mark packages as: Essential, Nice-to-have, Unused
   - Create removal plan for 40+ unused packages

2. **Remove unused packages** (4 hours)
   - Remove: React DnD (drag and drop - not used)
   - Remove: Recharts (charts - not implemented)
   - Remove: HTML2Canvas (screenshots - why needed?)
   - Remove: Input OTP (no authentication flows)
   - Remove: Unused MUI Material components
   - Remove other redundant UI libraries

3. **Update critical dependencies** (4 hours)
   - React 18.3.1 → 19.2.4 (2 major versions)
   - React Leaflet 4.2.1 → 5.0.0 (breaking changes)
   - Lucide React 0.487.0 → 1.7.0 (API changes)
   - Date-fns 3.6.0 → 4.1.0
   - React Router updates

4. **Fix package.json configuration** (2 hours)
   - Change name from `@figma/my-make-file` to `oratio-prayer-platform`
   - Update scripts for better DX
   - Add proper peerDependencies and engines
   - Create minimal viable stack documentation

**Acceptance Criteria:**

- Package count reduced from 69 to ~25
- No build or runtime errors after updates
- All tests (if any) pass
- Bundle size reduced by 30%+

#### **Epic 2: Fix Privacy Violation**

**Priority**: Critical
**Estimated Effort**: 4-6 hours

**Tasks:**

1. **Update mock data** (2 hours)
   - Modify `src/app/data/prayer-data.ts`
   - Replace exact lat/lng coordinates with city/country only
   - Add approximate location generation logic

2. **Update map components** (2 hours)
   - Modify `src/app/components/world-map.tsx`
   - Show approximate locations (city-level) not exact points
   - Update tooltips and popups to show city/country only

3. **Update documentation** (1 hour)
   - Update Memory Bank to reflect privacy compliance
   - Update README privacy section

**Acceptance Criteria:**

- No exact coordinates stored anywhere in codebase
- Map shows approximate locations only
- Documentation updated to reflect privacy compliance

### **Week 2: Code Quality & Architecture**

**Focus**: Improve code structure, implement design tokens, and set up development tools

#### **Epic 3: Implement Design Tokens**

**Priority**: High
**Estimated Effort**: 6-8 hours

**Tasks:**

1. **Create design tokens file** (2 hours)
   - Create `src/styles/design-tokens.css`
   - Define CSS variables for:
     - Colors (primary, background, text, accents)
     - Spacing (xs, sm, md, lg, xl)
     - Typography (font sizes, weights, line heights)
     - Border radius, shadows, transitions

2. **Update Tailwind config** (1 hour)
   - Modify `tailwind.config.js` to use design tokens
   - Ensure consistency between Tailwind and CSS variables

3. **Replace inline styles** (4 hours)
   - Audit components for hardcoded colors/spacing
   - Create component styling guidelines
   - Update 10+ components to use design tokens

4. **Create component documentation** (1 hour)
   - Add JSDoc comments to components
   - Create basic Storybook or style guide

**Acceptance Criteria:**

- All colors/spacing use CSS variables
- Consistent styling across all components
- Design tokens documented and accessible

#### **Epic 4: Component Architecture**

**Priority**: High
**Estimated Effort**: 6-8 hours

**Tasks:**

1. **Restructure components directory** (3 hours)
   - Reorganize `src/app/components/` with atomic design:
     - `ui/` (atoms: Button, Input, Card, etc.)
     - `layout/` (molecules: Header, Footer, Navigation)
     - `features/` (organisms: PrayerCard, FeedCard, etc.)

2. **Create reusable component patterns** (2 hours)
   - Standardize prop interfaces
   - Create base component templates
   - Implement consistent error handling

3. **Set up development tooling** (2 hours)
   - Enable TypeScript strict mode
   - Configure ESLint with React Hooks rules
   - Set up Prettier with project-specific rules
   - Add Husky pre-commit hooks

**Acceptance Criteria:**

- Component structure follows atomic design
- Consistent component patterns established
- Development tools enforce code quality

### **Week 3: Performance & Security**

**Focus**: Improve performance, add basic security, and set up testing

#### **Epic 5: Performance Improvements**

**Priority**: High
**Estimated Effort**: 6-8 hours

**Tasks:**

1. **Implement pagination** (3 hours)
   - Add infinite scroll to prayer feed
   - Implement virtualized lists for large datasets
   - Add loading states and skeleton components

2. **Optimize map rendering** (2 hours)
   - Cluster map markers for performance
   - Implement lazy loading for map tiles
   - Optimize marker rendering logic

3. **Bundle optimization** (2 hours)
   - Analyze bundle with `vite-bundle-analyzer`
   - Implement code splitting (route-based)
   - Optimize image loading

**Acceptance Criteria:**

- Prayer feed paginated (loads in chunks)
- Map performance improved
- Bundle size optimized

#### **Epic 6: Security Foundation**

**Priority**: Critical
**Estimated Effort**: 6-8 hours

**Tasks:**

1. **Input validation** (3 hours)
   - Add Zod schemas for all forms
   - Implement form validation with error messages
   - Add input sanitization

2. **XSS protection** (2 hours)
   - Implement DOMPurify for user-generated content
   - Sanitize prayer content before display
   - Add content security headers

3. **Error handling & monitoring** (2 hours)
   - Implement React Error Boundaries
   - Add centralized error logging
   - Create toast notification system (Sonner)

**Acceptance Criteria:**

- All user inputs validated
- XSS vulnerabilities addressed
- Error boundaries implemented

#### **Epic 7: Testing Foundation**

**Priority**: Medium
**Estimated Effort**: 4-6 hours

**Tasks:**

1. **Set up testing framework** (2 hours)
   - Install Jest + React Testing Library
   - Configure test environment
   - Create basic test utilities

2. **Create unit tests** (2 hours)
   - Test critical utilities and helpers
   - Test component rendering
   - Test form validation logic

3. **Create integration tests** (2 hours)
   - Test core user flows
   - Test API integration (mock)
   - Test error scenarios

**Acceptance Criteria:**

- Testing framework operational
- Critical paths have test coverage
- Tests run in CI environment

## Critical Path Items

1. **Dependency cleanup** - Week 1
2. **Privacy fix** - Week 1
3. **Design tokens** - Week 2
4. **Pagination** - Week 3
5. **Input validation** - Week 3

## Dependencies

### **Internal Dependencies:**

- None - Phase 1 is independent foundation work

### **External Dependencies:**

- GitHub repository access
- Development environment (Node.js, npm)
- Time allocation (15-20 hours/week)

## Risk Assessment

### **High Risk:**

- **Breaking changes during dependency updates**
  - Mitigation: Update one major dependency at a time, test thoroughly
- **Performance regression after pagination**
  - Mitigation: Test with large datasets, implement gradual rollout

### **Medium Risk:**

- **Design token implementation affecting UI**
  - Mitigation: Create visual regression tests, review changes
- **Testing framework setup complexity**
  - Mitigation: Start with simple tests, expand gradually

### **Low Risk:**

- **Component restructuring**
  - Mitigation: Keep old structure during transition, update incrementally
- **Documentation updates**
  - Mitigation: Update as part of each task completion

## Resource Requirements

### **Frontend Developer:**

- **Week 1**: 15-20 hours
- **Week 2**: 15-20 hours
- **Week 3**: 15-20 hours
- **Total**: 45-60 hours

### **QA/Testing (starting Week 3):**

- **Week 3**: 5-10 hours
- **Total**: 5-10 hours

## Deliverables

### **Week 1 Deliverables:**

- Cleaned up `package.json` with ~25 dependencies
- Updated React 19 and other critical packages
- Privacy-compliant mock data and map components
- Updated documentation

### **Week 2 Deliverables:**

- Design tokens implemented (CSS variables)
- Restructured component architecture
- Development tooling configured (ESLint, Prettier, TypeScript strict)
- Component documentation

### **Week 3 Deliverables:**

- Paginated prayer feed
- Input validation and XSS protection
- Error boundaries and monitoring
- Basic testing framework
- Performance optimizations

## Quality Gates

### **Code Quality:**

- No TypeScript errors in strict mode
- ESLint passes with no warnings
- Prettier formatting applied
- Component documentation complete

### **Performance:**

- Bundle size reduced by 30%+
- Prayer feed loads in chunks
- Map renders efficiently with 100+ markers

### **Security:**

- No exact coordinates stored
- All user inputs validated
- XSS protection implemented

### **Testing:**

- Critical utilities have unit tests
- Core user flows have integration tests
- Tests pass in CI environment

## Integration with Memory Bank

**Update these Memory Bank files during Phase 1:**

- `activeContext.md`: Track progress and decisions
- `progress.md`: Update completion status
- `techContext.md`: Document new stack and tools
- `systemPatterns.md`: Document new architecture patterns

## Getting Started

### **Day 1 Tasks:**

1. Create GitHub Project using `github-setup-guide.md`
2. Create Phase 1 issues from this document
3. Start with dependency audit (Epic 1)
4. Update Memory Bank with Phase 1 start

### **Weekly Checkpoints:**

- **Friday Week 1**: Review dependency cleanup progress
- **Friday Week 2**: Review design tokens implementation
- **Friday Week 3**: Complete Phase 1 and prepare for Phase 2

## Exit Criteria

**Phase 1 is complete when:**

1. All Week 1-3 deliverables are completed
2. Success criteria are met
3. Code passes quality gates
4. Memory Bank is updated
5. Team is ready for Phase 2 (Backend Integration)

---

**Last Updated**: 2026-04-04  
**Next Phase**: Phase 2 - Backend Integration (Weeks 4-7)
