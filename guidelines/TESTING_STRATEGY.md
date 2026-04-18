# Oratio Testing Strategy

## Purpose
This document defines the testing approach for the Oratio platform, with specific guidance for AI agents implementing tests. It balances thoroughness with pragmatism for a solo developer/MVP context.

---

## 1. Testing Philosophy

### Core Principles
1. **Security First:** Critical security and privacy features get highest testing priority
2. **User Flow Coverage:** Core user journeys must be reliably tested
3. **Progressive Coverage:** Start with critical paths, expand coverage over time
4. **Practical Over Perfect:** MVP-focused testing that delivers confidence without perfectionism

### Testing Mindset for AI Implementation
- **I am the first line of defense** - Catch issues before they reach users
- **I test what matters most** - Focus on security, privacy, core functionality
- **I document test gaps** - Explicitly note what's not tested and why
- **I make tests maintainable** - Write clear, focused tests that won't burden future development

---

## 2. Testing Pyramid (Oratio Adaptation)

### Target Distribution
```
        ▲
        │
  50%   ├───────────────────────┐ Unit Tests
        │                       │ (Utilities, validation, security)
        │                       │
  30%   ├─────────────┐         │ Integration Tests  
        │             │         │ (User flows, component interactions)
        │             │         │
  20%   ├─────┐       │         │ Manual Testing
        │     │       │         │ (Real device, accessibility, UX)
        └─────┴───────┴─────────┴────────────►
       Foundational          User-Facing
```

### Justification for Distribution
- **50% Unit tests:** Critical for security validation, data integrity, utility functions
- **30% Integration tests:** Essential for user flows that drive Oratio's value
- **20% Manual testing:** Necessary for accessibility, real device performance, UX polish

---

## 3. Testing Tools & Setup

### Approved Testing Stack
| Tool | Purpose | Status |
|------|---------|--------|
| **Jest** | Unit testing framework | ✅ Required |
| **React Testing Library** | Component integration tests | ✅ Required |
| **MSW (Mock Service Worker)** | API mocking | ✅ Recommended |
| **Playwright** | E2E testing | ⏳ Phase 2+ |
| **Jest Axe** | Accessibility testing | ✅ Recommended |

### Configuration Requirements (AI Must Implement)
```javascript
// jest.config.js minimum setup
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

### Test File Naming Convention
- **Unit tests:** `*.test.ts` or `*.test.tsx`
- **Integration tests:** `*.integration.test.tsx`
- **Test utilities:** `test-utils.ts`
- **Test data:** `__tests__/fixtures/`

---

## 4. Testing Priority Matrix

### P1: Critical (Must Have Tests)
**What:** Security, privacy, core user flows
**Why:** Prevents catastrophic failures, protects user data
**Examples:**
- Input validation (Zod schemas)
- Privacy checks (no coordinate storage)
- Prayer submission flow
- "I Prayed" interaction
- User authentication (when implemented)

**AI Implementation Priority:** ✅ **Immediate** - Tests required before feature completion

### P2: Important (Should Have Tests)
**What:** Secondary features, data integrity, error handling
**Why:** Ensures reliability, prevents user frustration
**Examples:**
- Prayer feed pagination
- Map marker clustering
- Profile statistics calculation
- Form error states
- Network failure handling

**AI Implementation Priority:** ⏳ **Phase 1 completion** - Tests within same development phase

### P3: Nice-to-Have (Can Defer)
**What:** UI polish, edge cases, performance optimizations
**Why:** Improves experience but not critical to MVP
**Examples:**
- Animation smoothness
- Image loading states
- Offline mode edge cases
- Browser compatibility quirks
- Load testing

**AI Implementation Priority:** 📅 **Post-MVP** - Document test gap, implement later

### P4: Optional (Low Priority)
**What:** Cosmetic issues, developer experience
**Why:** Limited user impact
**Examples:**
- Component snapshot tests
- Code formatting utilities
- Build script helpers
- Development tooling

**AI Implementation Priority:** ❓ **As needed** - Only if time permits

---

## 5. Unit Testing Guidelines

### What to Unit Test (AI Focus Areas)
1. **Validation logic** - Zod schemas, input sanitization
2. **Security utilities** - Privacy checks, authentication helpers
3. **Data transformations** - Date formatting, text truncation, data mapping
4. **Business logic** - Prayer count calculations, statistics
5. **Utility functions** - Pure functions with clear inputs/outputs

### Unit Test Template (AI Should Follow)
```typescript
import { validatePrayerMessage } from './validation';

describe('validatePrayerMessage', () => {
  // Happy path
  it('accepts valid prayer messages', () => {
    const result = validatePrayerMessage('Please pray for my family');
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  // Edge cases
  it('rejects empty messages', () => {
    const result = validatePrayerMessage('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Message is required');
  });

  it('rejects messages exceeding 500 characters', () => {
    const longMessage = 'a'.repeat(501);
    const result = validatePrayerMessage(longMessage);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Maximum 500 characters');
  });

  // Security cases
  it('sanitizes HTML in messages', () => {
    const maliciousMessage = 'Pray for me <script>alert("xss")</script>';
    const result = validatePrayerMessage(maliciousMessage);
    expect(result.sanitizedMessage).not.toContain('<script>');
  });
});
```

### Unit Test Best Practices (AI Must Follow)
- **One assertion per concept** - Test one thing per `it` block
- **Descriptive test names** - `it('does something when condition')`
- **Minimal mocking** - Mock only external dependencies
- **Clean test data** - Use factories/fixtures for test data
- **No testing implementation details** - Test behavior, not internals

---

## 6. Integration Testing Guidelines

### What to Integration Test (AI Focus Areas)
1. **User flows** - Complete sequences of user interactions
2. **Component interactions** - Multiple components working together
3. **API integration** - Data fetching and state updates
4. **Form submissions** - End-to-end form validation and submission
5. **Navigation** - Route changes and navigation state

### Integration Test Template (AI Should Follow)
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrayerSubmissionForm } from './PrayerSubmissionForm';
import { PrayerProvider } from '../context/PrayerContext';

describe('PrayerSubmissionForm', () => {
  it('submits a prayer successfully', async () => {
    // Arrange
    render(
      <PrayerProvider>
        <PrayerSubmissionForm />
      </PrayerProvider>
    );

    // Act
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'Please pray for healing' }
    });
    fireEvent.click(screen.getByText('Submit'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Prayer submitted!')).toBeInTheDocument();
    });
  });

  it('shows validation errors for invalid input', async () => {
    // Arrange
    render(
      <PrayerProvider>
        <PrayerSubmissionForm />
      </PrayerProvider>
    );

    // Act
    fireEvent.click(screen.getByText('Submit'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Message is required')).toBeInTheDocument();
    });
  });
});
```

### Integration Test Best Practices (AI Must Follow)
- **Test user perspective** - Interact as a user would
- **Use accessible queries** - `getByRole`, `getByLabelText`, `getByText`
- **Mock external services** - Use MSW for API mocking
- **Test error states** - Network failures, validation errors
- **Clean up after tests** - Reset mocks, clear state

---

## 7. Security & Privacy Testing

### Mandatory Security Tests (AI Must Implement)
| Test Area | What to Test | Example |
|-----------|--------------|---------|
| **Input Validation** | All user inputs reject malicious content | SQL injection, XSS attempts |
| **Privacy Protection** | No exact coordinates stored | Location data granularity |
| **Authentication** | Proper authorization checks | Unauthorized access attempts |
| **Data Exposure** | No sensitive data leaks | Error messages, API responses |

### Security Test Template
```typescript
describe('Privacy Protection', () => {
  it('never stores exact coordinates', () => {
    const location = { lat: 51.5074, lng: -0.1278 }; // London coordinates
    const result = sanitizeLocation(location);
    
    // Should only store city/country, not coordinates
    expect(result).toEqual({
      city: 'London',
      country: 'UK'
    });
    expect(result.lat).toBeUndefined();
    expect(result.lng).toBeUndefined();
  });

  it('prevents coordinate storage via API', async () => {
    const maliciousPayload = {
      message: 'Pray for me',
      location: { lat: 51.5074, lng: -0.1278 } // Should be rejected
    };
    
    const response = await submitPrayer(maliciousPayload);
    expect(response.status).toBe(400);
    expect(response.error).toContain('Invalid location data');
  });
});
```

---

## 8. Accessibility Testing

### Required Accessibility Tests (AI Must Implement)
1. **Keyboard navigation** - All interactive elements reachable via Tab
2. **Screen reader compatibility** - Semantic markup, ARIA labels
3. **Color contrast** - WCAG 2.1 AA compliance (4.5:1)
4. **Focus management** - Visible focus indicators, logical focus order

### Accessibility Test Template
```typescript
import { axe } from 'jest-axe';

describe('Accessibility', () => {
  it('prayer card has no accessibility violations', async () => {
    const { container } = render(<PrayerCard {...props} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('is keyboard navigable', () => {
    render(<PrayerFeed prayers={mockPrayers} />);
    
    // Tab through interactive elements
    userEvent.tab();
    expect(screen.getByRole('button', { name: /i prayed/i })).toHaveFocus();
    
    userEvent.tab();
    expect(screen.getByRole('button', { name: /share/i })).toHaveFocus();
  });
});
```

---

## 9. Performance Testing

### Performance Test Areas (AI Should Consider)
| Area | What to Test | Target |
|------|--------------|--------|
| **Bundle size** | JavaScript/CSS asset size | < 500KB gzipped |
| **Load time** | First contentful paint | < 3s mobile 3G |
| **Interaction** | Time to interactive | < 5s |
| **Memory** | Client-side memory usage | No leaks |

### Performance Test Approach
```typescript
// Bundle size check (package.json script)
"scripts": {
  "test:performance": "npm run build -- --report && node scripts/check-bundle-size.js"
}

// Manual performance checklist
- [ ] Lighthouse performance score > 90
- [ ] No large synchronous imports
- [ ] Images optimized (WebP, lazy loading)
- [ ] Code splitting implemented
```

---

## 10. Manual Testing Protocol

### When Manual Testing Is Required (AI Should Recommend)
1. **Real device testing** - Mobile responsiveness, touch interactions
2. **Browser compatibility** - Cross-browser behavior
3. **Accessibility verification** - Screen reader experience
4. **Performance validation** - Real network conditions
5. **User experience** - Flow intuitiveness, visual polish

### Manual Testing Checklist Template
```markdown
## Manual Test: Prayer Submission Flow

### Test Steps
1. [ ] Open app on mobile device
2. [ ] Navigate to Submit Prayer screen
3. [ ] Enter prayer message (500 chars max)
4. [ ] Select location (city/country only)
5. [ ] Toggle anonymous option
6. [ ] Submit prayer
7. [ ] Verify success message
8. [ ] Check prayer appears in feed

### Success Criteria
- [ ] Submission completes in < 3 seconds
- [ ] No exact coordinates stored
- [ ] Anonymous toggle works correctly
- [ ] Error messages clear and helpful
- [ ] Keyboard navigation works

### Issues Found
- [ ] None
- [ ] Document any issues here
```

---

## 11. Test Implementation Roadmap

### Phase 1: Foundation Testing (Weeks 1-3)
**AI Implementation Focus:**
1. Set up Jest + React Testing Library
2. Create security/privacy unit tests
3. Implement core user flow integration tests
4. Add accessibility test utilities

**Coverage Target:** 70% of critical paths (P1 tests)

### Phase 2: Comprehensive Testing (Weeks 4-6)
**AI Implementation Focus:**
1. Expand integration test coverage
2. Add API mocking with MSW
3. Implement performance monitoring
4. Add E2E tests for critical flows

**Coverage Target:** 85% of important paths (P1+P2 tests)

### Phase 3: Production Testing (Weeks 7-9)
**AI Implementation Focus:**
1. Add monitoring and alert tests
2. Implement load testing setup
3. Complete test documentation
4. Establish CI/CD test pipeline

**Coverage Target:** 90%+ of all testable code

---

## 12. AI Testing Responsibilities

### Before Code Changes
- [ ] Check existing test coverage of affected code
- [ ] Review testing requirements for the feature/change
- [ ] Plan test implementation alongside feature work

### During Implementation
- [ ] Write tests concurrently with feature code
- [ ] Follow testing templates and patterns
- [ ] Verify tests pass locally before completion

### After Implementation
- [ ] Run full test suite (`npm test`)
- [ ] Check coverage reports (`npm run test:coverage`)
- [ ] Update test documentation if needed
- [ ] Note any test gaps for future work

### When Tests Fail
1. **Analyze failure** - Is it test bug or real issue?
2. **Fix immediate issues** - Critical failures must be addressed
3. **Document flaky tests** - Note unstable tests for investigation
4. **Update tests** - Keep tests aligned with code changes

---

## 13. Test Maintenance & Evolution

### Test Quality Indicators (AI Should Monitor)
- **Passing rate:** > 95% of tests passing consistently
- **Run time:** Complete test suite < 5 minutes
- **Flakiness:** < 5% of tests intermittently failing
- **Coverage:** Meeting phase-appropriate targets

### When to Refactor Tests
1. **Tests become brittle** - Breaking with minor implementation changes
2. **Test duplication** - Same logic tested in multiple places
3. **Slow test suite** - Taking too long to run
4. **Unclear tests** - Difficult to understand purpose

### Test Documentation Updates
- **When adding new test patterns** - Update this document
- **When discovering testing gaps** - Note in backlog
- **When changing testing approach** - Document rationale
- **When removing tests** - Explain why in commit message

---

## 14. Special Considerations for AI Testing

### AI Testing Strengths to Leverage
- **Consistency** - Following patterns precisely
- **Thoroughness** - Checking all specified cases
- **Documentation** - Clear test descriptions and comments
- **Pattern recognition** - Identifying test gaps from similar features

### AI Testing Limitations to Address
- **Context understanding** - May miss subtle user experience issues
- **Real-world conditions** - Cannot fully replicate device/network variability
- **Creative edge cases** - May not imagine unusual user behavior
- **Subjective quality** - Hard to assess "feel" or "polish"

### Mitigation Strategies
1. **Combine AI and manual testing** - AI handles systematic tests, human handles exploratory
2. **Clear acceptance criteria** - Detailed requirements guide AI test creation
3. **Regular human review** - Periodically review test quality and coverage
4. **Real device verification** - Always include manual testing on actual devices

---

## 15. Success Metrics

### Quantitative Metrics
- **Test coverage:** Phase-appropriate targets met
- **Test pass rate:** > 95% consistently
- **Test run time:** < 5 minutes for full suite
- **Bug escape rate:** < 5% of issues reaching users

### Qualitative Metrics
- **Developer confidence** - Trust in test suite to catch issues
- **User satisfaction** - Fewer bugs, better experience
- **Maintenance ease** - Tests are understandable and maintainable
- **Release confidence** - Comfort deploying with current test coverage

---

## How to Use This Strategy

### For AI Agents (Implementation Guide)
1. **Reference before writing tests** - Check appropriate sections
2. **Follow templates** - Use provided patterns for consistency
3. **Prioritize appropriately** - Focus on P1 tests first
4. **Document deviations** - Note when strategy needs adaptation

### For Human Developers
- **Understand the approach** - See what tests will be created and why
- **Provide clear requirements** - Detailed AC guides better tests
- **Review test quality** - Check that tests match user needs
- **Supplement as needed** - Add manual testing for subjective areas

### For Project Planning
- **Estimate test effort** - Testing is 20-30% of feature development time
- **Schedule test phases** - Align with development phases
- **Allocate review time** - Plan for test review and refinement
- **Budget for maintenance** - Tests require ongoing updates

---

*Testing Strategy Version: 1.0*  
*Aligned with Oratio Phase 0 Foundation*  
*Last Updated: 2026-04-18*  
*Next Review: End of Phase 1*