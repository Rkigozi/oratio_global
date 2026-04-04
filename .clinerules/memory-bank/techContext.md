# Tech Context - Oratio Prayer Platform

## Current Technology Stack (As-Is)

### Core Technologies:
- **Frontend Framework**: React 18.3.1 + TypeScript
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS 4.1.12 + inline styles
- **Routing**: React Router 7.13.0
- **Maps**: React Leaflet 4.2.1 + Leaflet 1.9.4
- **Animations**: Motion (Framer Motion) 12.23.24
- **Icons**: Lucide React 0.487.0

### UI Component Libraries (Redundant):
1. **Radix UI**: 30+ components imported
2. **MUI Material**: Full suite imported but minimally used
3. **Custom Components**: Mixed with library components

### Development Tools:
- **Package Manager**: npm
- **TypeScript**: Configured but not strict mode
- **CSS**: Tailwind with custom config
- **No Testing Framework**: No tests implemented
- **No Linting/Formatting**: No ESLint/Prettier config

## Critical Technical Issues

### Dependency Problems:
1. **69 Dependencies**: Massive bloat for simple app
2. **Outdated Packages**:
   - React: 18.3.1 (latest: 19.2.4) - 2 major versions behind
   - React Leaflet: 4.2.1 (latest: 5.0.0) - Major breaking changes
   - Lucide React: 0.487.0 (latest: 1.7.0) - Complete API change
   - Date-fns: 3.6.0 (latest: 4.1.0) - Major version
3. **Unused Packages**:
   - React DnD (drag and drop) - Not used
   - Recharts (charts) - Not implemented
   - HTML2Canvas (screenshots) - Why needed?
   - Input OTP - No authentication flows

### Code Quality Issues:
1. **Inline Styles**: Hardcoded colors, spacing throughout
2. **Mixed State Management**: useState + localStorage as database
3. **No Error Handling**: Empty catch blocks, no error boundaries
4. **Type Safety Gaps**: Optional properties used as required
5. **Performance Issues**: No pagination, all data loaded at once

### Security Issues:
1. **Privacy Violation**: Storing exact lat/lng coordinates
2. **No Input Validation**: User content accepted without validation
3. **XSS Vulnerabilities**: User content displayed raw
4. **Vulnerable Dependencies**: Outdated packages with known vulnerabilities

## Development Environment

### Current Setup:
- **Node.js**: Not specified in package.json
- **npm**: Used but dependencies not installed
- **No node_modules**: Project cannot run
- **Build Scripts**: Basic Vite scripts only
- **No Dev Server Config**: Default Vite config

### Missing Development Tools:
1. **ESLint**: No code quality enforcement
2. **Prettier**: No code formatting
3. **Husky**: No pre-commit hooks
4. **Testing**: No unit/integration tests
5. **TypeScript Strict**: Not enabled

## Target Technology Stack (To-Be)

### Recommended Stack:
```
Frontend: React 19 + TypeScript (strict mode)
Build: Vite + SWC for faster builds
Styling: Tailwind CSS + CSS Variables (design tokens)
State: Zustand (global) + React Query (server)
Forms: React Hook Form + Zod validation
UI: Radix UI (primitives only) + custom components
Maps: React Leaflet v5
Icons: Lucide React v1
Animations: Framer Motion
Notifications: Sonner (toasts)
```

### Development Tools to Add:
1. **ESLint**: Airbnb config + React Hooks rules
2. **Prettier**: Consistent code formatting
3. **Husky**: Pre-commit hooks for linting/testing
4. **Jest + React Testing Library**: Unit/integration tests
5. **Playwright**: E2E testing for critical flows
6. **Bundle Analyzer**: Monitor bundle size

## Infrastructure Requirements

### Backend (Supabase):
- **Database**: PostgreSQL with schema from Data-Model.md
- **Auth**: Supabase Auth with anonymous option
- **Storage**: For user icons/profile images
- **Edge Functions**: For translation, moderation, etc.

### Deployment:
- **Platform**: Vercel or Netlify (PWA support)
- **CI/CD**: GitHub Actions for automated deployment
- **Monitoring**: Sentry for error tracking
- **Analytics**: Simple analytics for MVP metrics

### PWA Requirements:
1. **Web App Manifest**: For installability
2. **Service Worker**: For offline capability
3. **HTTPS**: Required for PWA features
4. **Responsive Design**: Mobile-first approach

## Technical Constraints

### Must-Have Constraints:
1. **Privacy**: Never store exact user locations
2. **Performance**: Sub-2-second load times on mobile
3. **Accessibility**: WCAG 2.1 AA compliance
4. **Security**: Input validation, content sanitization
5. **Offline Support**: Basic offline capability for PWA

### Nice-to-Have Constraints:
1. **Internationalization**: RTL support, translation system
2. **Push Notifications**: For prayer responses
3. **Real-time Updates**: WebSockets for live prayer counts
4. **Image Optimization**: Automatic image compression

## Migration Challenges

### High Risk Migrations:
1. **React 18 → 19**: Breaking changes in React API
2. **React Leaflet 4 → 5**: Complete API rewrite
3. **Lucide React 0.x → 1.x**: Icon import changes
4. **MUI Removal**: Replace MUI components with Radix/custom

### Medium Risk Migrations:
1. **State Management**: Introduce Zustand + React Query
2. **Design Tokens**: Replace inline styles with CSS variables
3. **API Layer**: Migrate from mock data to Supabase
4. **Testing Setup**: Add comprehensive test suite

## Performance Targets

### Bundle Size:
- **Initial Load**: < 100KB gzipped
- **Total Bundle**: < 500KB gzipped
- **Code Splitting**: Route-based and component-based

### Load Times:
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Largest Contentful Paint**: < 2.5s

### Core Web Vitals:
- **CLS**: < 0.1
- **FID**: < 100ms
- **LCP**: < 2.5s

## Development Workflow

### Recommended Process:
1. **Feature Development**: Feature branches from main
2. **Code Review**: PR reviews with linting/testing requirements
3. **Testing**: Unit tests required for new features
4. **Deployment**: Automated deployment to staging/production

### Quality Gates:
1. **TypeScript**: No `any` types, strict mode enabled
2. **Test Coverage**: > 80% for critical paths
3. **Bundle Size**: Alerts for size increases > 10%
4. **Accessibility**: Automated a11y testing in CI

## Knowledge Gaps

### Areas Needing Documentation:
1. **Supabase Setup**: Database schema, auth configuration
2. **PWA Configuration**: Manifest, service worker setup
3. **Deployment Pipeline**: CI/CD configuration
4. **Monitoring Setup**: Error tracking, performance monitoring

### Team Skills Required:
1. **React/TypeScript**: Core frontend development
2. **Supabase/PostgreSQL**: Backend/database skills
3. **DevOps**: Deployment, monitoring, CI/CD
4. **QA/Testing**: Test automation, accessibility testing

## Immediate Technical Actions

### Week 1:
1. Install dependencies: `npm install`
2. Audit and clean package.json
3. Set up basic development tools (ESLint, Prettier)
4. Create proper project structure

### Week 2:
1. Update critical dependencies (React, React Router)
2. Implement design tokens (CSS variables)
3. Add basic error handling and loading states
4. Set up testing framework

### Week 3:
1. Implement state management (Zustand)
2. Create API layer abstraction
3. Add pagination for performance
4. Set up CI/CD pipeline

---
*Last Updated: 2026-04-04*
*Status: Technical Analysis Complete*
*Next Review: After Dependencies Installed*