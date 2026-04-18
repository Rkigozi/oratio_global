# Oratio AI Agent Development Guidelines

## Purpose
These guidelines define how AI agents (like me) should approach development work on the Oratio codebase. They ensure consistency, maintainability, and alignment with project goals when AI assistance is used.

---

## 1. AI Agent Development Philosophy

### Core Principles for AI Work
1. **User-Centric Implementation:** Every change should serve real user needs from the MVP scope
2. **Privacy-First Approach:** Never implement features that store exact locations; protect user data by design
3. **Incremental Improvement:** Make small, testable changes rather than large rewrites
4. **Documentation as Part of Work:** Explain decisions in code comments and update project documentation

### AI Agent Mindset
- **I am a collaborative tool** - My role is to assist, not dictate
- **I follow existing patterns** - Study the codebase before making changes
- **I validate assumptions** - Check if dependencies/libraries are actually used before modifying
- **I preserve intent** - Maintain the original design and architecture decisions

---

## 2. Code Style & Quality Standards

### TypeScript Requirements
- **Always use strict mode** - Never introduce `any` types; create proper interfaces
- **Meaningful, descriptive names** - Use `prayerCount` not `cnt`, `userProfile` not `prof`
- **Match data model** - Interfaces should align with `Data-Model.md` structure

### React Components (AI Implementation)
- **Functional components only** - Do not create class components
- **Single responsibility** - Split components that become too large
- **Complete prop interfaces** - Every component must have a typed `Props` interface

**Example pattern to follow:**
```tsx
interface PrayerCardProps {
  message: string;
  prayerCount: number;
  location: string;
}

export function PrayerCard({ message, prayerCount, location }: PrayerCardProps) {
  return (
    <div className="prayer-card">
      <p>{message}</p>
      <span>{prayerCount} prayers • {location}</span>
    </div>
  );
}
```

### File & Folder Naming Conventions
- **Files:** kebab-case (`prayer-card.tsx`, `user-profile.tsx`)
- **Components:** PascalCase (`PrayerCard`, `UserProfile`)
- **Organization:** Feature-based folders (`features/prayers/`, `features/map/`)

---

## 3. Component Architecture Guidelines

### Target Structure (AI Should Maintain)
```
src/
├── components/          # Reusable UI components
│   ├── ui/            # Primitives (Button, Input, Card)
│   └── shared/        # Shared across features
├── features/          # Feature-specific code
│   ├── prayers/       # Everything prayer-related
│   ├── map/           # Map functionality
│   └── profile/       # User profile
├── lib/               # Utilities, helpers, constants
├── api/               # API client, Supabase integration
└── styles/            # CSS, design tokens
```

### Separation of Concerns (AI Enforcement)
- **UI components** handle rendering and user interaction only
- **API hooks** manage data fetching (use React Query patterns)
- **State stores** handle global state (use Zustand patterns)
- **Utility functions** perform calculations, formatting, transformations

---

## 4. State Management Rules

### Technology Choices (AI Must Follow)
| Use Case | Technology | Example |
|----------|------------|---------|
| **Server data** | React Query | `useQuery('prayers', fetchPrayers)` |
| **Forms** | React Hook Form + Zod | Prayer submission forms |
| **Global UI state** | Zustand | `useThemeStore()` |
| **Component state** | `useState` | `const [isOpen, setIsOpen] = useState(false)` |

### Critical Prohibition
- **❌ Never use localStorage as a database** - Only for UI preferences
- **❌ Never store prayer/user data locally** - Real data belongs in Supabase (Phase 2+)
- **✅ localStorage only for** theme, sidebar state, other UI preferences

---

## 5. Security & Privacy (Absolute Requirements)

### Non-Negotiable Rules for AI Implementation
1. **❌ Never store exact coordinates** - Only city and country level data
2. **✅ Always validate user input** - Implement Zod schemas for all forms
3. **✅ Sanitize user content** - Use DOMPurify before displaying prayers
4. **✅ Provide anonymous option** - Must be available for sensitive requests

### Privacy Checklist (AI Verification)
- [ ] No latitude/longitude in database or code
- [ ] Anonymous submission toggle implemented and working
- [ ] Clear safety disclaimer visible to users
- [ ] Input validation prevents XSS attacks

### Security Checklist (AI Implementation)
- [ ] Dependencies updated (check for vulnerabilities)
- [ ] No secrets or API keys in code
- [ ] HTTPS enforcement in production configuration
- [ ] Basic rate limiting consideration (backend integration)

---

## 6. Accessibility Implementation Standards

### Minimum Requirements (AI Must Implement)
- **Keyboard navigation** - Full Tab/Enter/Space navigation support
- **Screen reader compatibility** - Semantic HTML, appropriate ARIA labels
- **Color contrast** - WCAG 2.1 AA compliance (4.5:1 minimum)
- **Focus indicators** - Visible focus rings for all interactive elements

### AI Testing Protocol
1. **Tab test** - Navigate entire app using keyboard only
2. **Screen reader simulation** - Check critical flows with accessibility tools
3. **Contrast verification** - Use browser Accessibility Inspector
4. **Zoom test** - Ensure 200% zoom doesn't break layouts

---

## 7. Performance Requirements

### Performance Targets (AI Optimization Goals)
- **First load** < 3 seconds on mobile 3G connection
- **Time to Interactive** < 5 seconds
- **Bundle size** < 500KB gzipped

### AI Implementation Priorities
1. **Dependency cleanup** - Remove unused packages (69 → ~25 target)
2. **Code splitting** - Implement route-based splitting at minimum
3. **Image optimization** - WebP format, lazy loading implementation
4. **Bundle monitoring** - Regular size checks with `npm run build -- --report`

---

## 8. Git & Change Management

### Commit Message Format (Conventional Commits)
```
feat: add prayer submission form
fix: resolve map marker clustering bug
docs: update API documentation
style: improve button hover states
refactor: extract prayer card component
test: add validation logic tests
chore: update dependencies
```

### AI Change Process
1. **Analyze before changing** - Understand existing patterns and dependencies
2. **Make incremental changes** - Small, focused commits rather than massive rewrites
3. **Self-review** - Check work against these guidelines before completion
4. **Document decisions** - Add code comments explaining "why" not just "what"

### Branch Strategy (AI Should Follow)
- `main` = production-ready code
- `feature/*` = new features (e.g., `feature/prayer-submission`)
- `fix/*` = bug fixes
- Merge to `main` only after verification

---

## 9. Testing Strategy for AI Work

### Testing Pyramid (AI Implementation Focus)
- **50% Unit tests** - Critical utilities, validation logic, security checks
- **30% Integration tests** - Core user flows (submit prayer, "I Prayed")
- **20% Manual verification** - Real device testing for critical paths

### Priority Testing Areas (AI Must Test)
1. **Security features** - Input validation, privacy protections
2. **Critical user flows** - Prayer submission, "I Prayed" interaction
3. **Data integrity** - Form validation, API interactions
4. **Error handling** - Network failures, invalid inputs

### Lower Priority (Can Defer)
1. UI component snapshot tests
2. Non-critical utility functions
3. Edge cases for non-essential features

See [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) for detailed testing approach.

---

## 10. Design System Implementation

### Design Tokens (CSS Variables) - AI Must Use
```css
/* src/styles/design-tokens.css */
:root {
  --color-primary: #7c8fff;
  --color-background: #0A1A3A;
  --color-text: #e2e4f0;
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
}
```

### Implementation Rule
```tsx
// ❌ Don't implement (inconsistent, hard to maintain)
<div style={{ color: '#7c8fff', padding: '1rem' }}>

// ✅ Do implement (consistent, maintainable)
<div className="prayer-card">
```

```css
/* Component CSS */
.prayer-card {
  color: var(--color-text);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}
```

---

## 11. Documentation Requirements

### What AI Must Document
- **Component purpose** - JSDoc comments for complex components
- **API endpoints** - Request/response formats, authentication
- **Database interactions** - Queries, relationships, constraints
- **Deployment steps** - Environment variables, build process

### Where AI Should Document
- **Code comments** - Explain "why" not just "what"
- **README files** - In each feature folder for context
- **Memory Bank** - High-level decisions and architecture
- **Backlog updates** - Progress on user stories and technical debt

---

## 12. When Guidelines Can Be Adapted

### Allowable Exceptions (With Documentation)
1. **User experience requirements** - Complex animations needing inline styles
2. **Performance optimization** - Careful use of `any` to avoid TypeScript overhead
3. **Time constraints** - MVP deadlines requiring pragmatic choices
4. **Learning/experimentation** - Trying new patterns with clear rollback plan

### Documentation Requirement
**When deviating from guidelines, AI must:**
1. Add code comment explaining the deviation
2. Reference the specific guideline being adapted
3. Justify the exception with clear reasoning
4. Consider future refactoring to align with guidelines

---

## 13. AI Work Verification Protocol

### Pre-Completion Checklist
- [ ] TypeScript strict mode passes (`npm run type-check`)
- [ ] ESLint passes without errors (`npm run lint`)
- [ ] All tests pass (unit, integration as applicable)
- [ ] Security/privacy requirements verified
- [ ] Accessibility basics confirmed (keyboard navigation)
- [ ] Performance impact assessed (bundle size check)

### Post-Implementation Review
- [ ] Code follows existing patterns in codebase
- [ ] No breaking changes to working functionality
- [ ] Documentation updated where needed
- [ ] Backlog/Memory Bank updated with progress

---

## 14. Technology Stack & Tooling

### Approved Development Stack
- **Build tool:** Vite (configured)
- **Styling:** Tailwind CSS + CSS custom properties
- **State management:** Zustand (global), React Query (server)
- **Forms:** React Hook Form + Zod validation
- **UI components:** Radix UI primitives + custom components
- **Maps:** React Leaflet (v5 target)
- **Notifications:** Sonner (toasts)

### AI Tool Usage Guidelines
- **VS Code patterns** - Follow existing code formatting
- **Browser DevTools** - Use for debugging, performance testing
- **Lighthouse** - Regular performance/accessibility audits
- **Package analysis** - Check bundle impact before adding dependencies

---

## 15. Phase-Based Implementation Focus

### Phase 1: Foundation (Weeks 1-3)
- **Focus:** Dependency cleanup, security fixes, design tokens
- **AI priority:** Remove unused packages, fix privacy violations, implement testing

### Phase 2: Backend Integration (Weeks 4-6)  
- **Focus:** Supabase setup, real data migration, performance
- **AI priority:** API layer implementation, state management, pagination

### Phase 3: Production Readiness (Weeks 7-9)
- **Focus:** PWA capabilities, monitoring, deployment pipeline
- **AI priority:** Service workers, error tracking, CI/CD setup

---

## How to Use These Guidelines

### For AI Agents (Like Me)
1. **Reference before starting** - Review relevant sections
2. **Check during implementation** - Use as verification checklist
3. **Update after completion** - Note any deviations or learnings

### For Human Developers
These guidelines show:
- The standards AI will follow when assisting
- The architecture decisions made
- The priorities (security, privacy, accessibility)
- The development process expectations

### When AI Assistance Is Requested
Reference specific sections: "Please follow Section 5 for privacy requirements" or "See Section 9 for testing approach"

---

## Guideline Maintenance

### Review Cycle
- **Weekly:** Quick check during development
- **Phase-end:** Comprehensive review after each phase
- **Project milestones:** Update for new requirements or learnings

### Update Process
1. Identify need for change (new requirement, better approach)
2. Document proposed change with reasoning
3. Update guideline with version tracking
4. Apply to future AI work immediately

---

*Guideline Version: 1.0 (AI Agent Edition)*  
*Based on Oratio Phase 0 Foundation*  
*Last Updated: 2026-04-18*  
*Next Review: End of Phase 1 (approx. 3 weeks)*