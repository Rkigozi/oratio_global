# System Patterns - Oratio Prayer Platform

## Current Architecture (As-Is)
### Platform Reality vs. Documentation
- **Documented**: React Native mobile app with Supabase backend
- **Actual**: React 18 + TypeScript web app with Vite, mock data only
- **Discrepancy**: Complete architecture mismatch requiring strategic decision

### Current Component Structure
```
src/
├── app/
│   ├── components/     # UI components (mixed Radix UI + MUI)
│   ├── pages/         # Page components (home, feed, submit, profile, etc.)
│   ├── data/          # Mock data generation
│   └── routes.ts      # React Router configuration
├── styles/            # CSS/Tailwind styles
└── main.tsx          # Application entry point
```

### Key Technical Decisions (Current)
1. **Build Tool**: Vite (modern, fast)
2. **Styling**: Tailwind CSS + inline styles (anti-pattern)
3. **UI Libraries**: Radix UI + MUI Material (redundant)
4. **State Management**: React useState + localStorage (fragmented)
5. **Routing**: React Router v7
6. **Maps**: React Leaflet (v4, outdated)

## Recommended Architecture (To-Be)
### Progressive Web App (PWA) Approach
```
Frontend: React 19 + TypeScript + Vite
Backend: Supabase (PostgreSQL + Auth + Storage)
Deployment: Vercel/Netlify with PWA capabilities
Mobile: Installable PWA, optional React Native later
```

### Target Component Architecture
```
src/
├── api/              # API client, types, React Query hooks
├── components/       # Reusable UI components (atomic design)
│   ├── ui/          # Primitive components (buttons, inputs)
│   ├── layout/      # Layout components
│   └── features/    # Feature-specific components
├── features/         # Feature modules
│   ├── auth/        # Authentication flows
│   ├── prayers/     # Prayer management
│   ├── map/         # Map functionality
│   └── profile/     # User profiles
├── hooks/           # Custom React hooks
├── lib/             # Utilities, constants, helpers
├── providers/       # Context providers
├── stores/          # Zustand state stores
├── types/           # TypeScript definitions
└── styles/          # Design tokens, global styles
```

## Data Flow Patterns
### Current (Mock Data):
```
Component → Local State → Mock Data → UI Render
```

### Target (Real Backend):
```
Component → React Query Hook → API Client → Supabase → UI Render
                      ↓
                Zustand Store (global state)
```

### State Management Strategy
1. **Server State**: React Query (caching, background updates)
2. **UI State**: React useState/useReducer (component-local)
3. **Global State**: Zustand (shared across components)
4. **Form State**: React Hook Form (validation, submission)

## API Integration Patterns
### Current: None (mock data only)
### Target: Centralized API Client
```typescript
// Example pattern
const api = {
  prayers: {
    list: (filters) => supabase.from('prayers').select('*', filters),
    create: (data) => supabase.from('prayers').insert(data),
    pray: (id, userId) => supabase.rpc('increment_prayer_count', { prayer_id: id, user_id: userId })
  },
  users: {
    create: (data) => supabase.from('users').insert(data),
    profile: (id) => supabase.from('users').select('*').eq('id', id).single()
  }
};
```

## Design System Patterns
### Current Issues:
- Inline styles throughout components
- No design tokens or CSS variables
- Mixed color values (hardcoded hex/rgba)
- Inconsistent spacing

### Target Pattern:
```css
/* Design tokens in CSS variables */
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

## Performance Patterns
### Current Issues:
- No pagination (loads all prayers)
- No virtualization for long lists
- No code splitting
- No image optimization

### Target Improvements:
1. **Pagination**: Infinite scroll or load-more for prayer feed
2. **Code Splitting**: Route-based and component-based
3. **Image Optimization**: Next-gen formats, lazy loading
4. **Bundle Optimization**: Tree-shaking, dependency cleanup

## Security Patterns
### Current Issues:
- No input validation
- XSS vulnerabilities (user content displayed raw)
- Privacy violation (exact coordinates stored)
- No authentication

### Target Patterns:
1. **Input Validation**: Zod schemas for all forms
2. **Content Sanitization**: DOMPurify for user-generated content
3. **Privacy Compliance**: Store only city/country, not coordinates
4. **Authentication**: Supabase Auth with anonymous option

## Error Handling Patterns
### Current Issues:
- Empty catch blocks (errors swallowed)
- No error boundaries
- No loading states
- No user feedback

### Target Patterns:
1. **Error Boundaries**: Global and component-level
2. **Toast Notifications**: Sonner for user feedback
3. **Loading States**: Skeleton components
4. **Retry Logic**: Exponential backoff for failed requests

## Testing Patterns
### Current: No tests
### Target Strategy:
1. **Unit Tests**: Jest for utilities, hooks, components
2. **Integration Tests**: React Testing Library for user flows
3. **E2E Tests**: Playwright for critical paths
4. **Snapshot Tests**: For UI components

## Deployment Patterns
### Current: Not deployed
### Target: CI/CD Pipeline
```
Development → GitHub → Vercel/Netlify → Production
      ↓           ↓           ↓
    Local      Preview     Production
    Build      Deploy       Deploy
```

## Migration Patterns
### Phase 1: Foundation
1. Install dependencies, make project runnable
2. Clean up package.json, remove unused dependencies
3. Implement design tokens, remove inline styles
4. Add basic error handling and loading states

### Phase 2: Architecture
1. Create proper project structure
2. Implement centralized API layer
3. Add state management (Zustand + React Query)
4. Set up testing framework

### Phase 3: Backend Integration
1. Set up Supabase project
2. Create database schema from Data-Model.md
3. Migrate mock data to real API calls
4. Implement authentication

### Phase 4: Production Readiness
1. Add PWA capabilities
2. Implement performance optimizations
3. Add monitoring and analytics
4. Create deployment pipeline

## Key Technical Decisions Pending
1. **UI Library**: Keep Radix UI, remove MUI (recommended)
2. **Animation Library**: Keep Motion (Framer Motion)
3. **Form Library**: Keep React Hook Form
4. **Map Library**: Update React Leaflet to v5
5. **Icon Library**: Update Lucide React to v1

## Anti-Patterns to Eliminate
1. ❌ Inline styles → ✅ CSS variables
2. ❌ Mixed UI libraries → ✅ Single consistent library
3. ❌ localStorage as database → ✅ Proper backend
4. ❌ Empty catch blocks → ✅ Proper error handling
5. ❌ Load all data → ✅ Pagination/virtualization

## Success Patterns to Establish
1. ✅ Atomic component design
2. ✅ TypeScript strict mode
3. ✅ Automated testing
4. ✅ CI/CD pipeline
5. ✅ Performance monitoring

---
*Last Updated: 2026-04-04*
*Status: Architecture Analysis Complete*
*Next Review: After Dependency Cleanup*