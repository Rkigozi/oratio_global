# Tech Context - Oratio Prayer Platform

## Current Technology Stack

### Core Technologies:
- **Frontend Framework**: React 19.0.0 + TypeScript 6.0.2
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS 4.1.12 + CSS variables (theme.css)
- **Routing**: React Router 7.13.0
- **Maps**: Leaflet 1.9.4 (direct usage, not react-leaflet)
- **Animations**: Motion (Framer Motion) 12.23.24
- **Icons**: Lucide React 0.487.0
- **Validation**: Zod ^4.3.6
- **Drawers**: Vaul 1.1.2
- **Fonts**: Inter (body) + Sora (headings) via Google Fonts

### Development Tools:
- **Package Manager**: npm
- **ESLint**: Configured with TypeScript + React plugins
- **Prettier**: Configured with consistent formatting
- **TypeScript**: Strict mode enabled
- **No Tests**: No testing framework installed yet

### Deployment:
- **Platform**: Netlify (SPA config)
- **Automation**: None (manual deploy)

## Current State

### What We Have:
- **Data**: All mock data in `src/app/data/` — no backend
- **Storage**: localStorage for profiles, submitted prayers, prayed IDs
- **Auth**: None — username-based identity in localStorage
- **Moderation**: None — no report flow or content filtering
- **PWA**: Not implemented — no service worker or manifest
- **Monitoring**: None — no error tracking or analytics

### What's Been Cleaned:
- Unused dependencies removed (from ~69 to ~20 packages)
- React updated from 18 to 19
- Privacy fix applied (approximate coordinates only)
- Input validation added (Zod for prayer submission)
- ESLint/Prettier configured
- Fonts fixed (were never loading, now loading via <link>)
- Debug console.logs removed
- Stale config files deleted

## Known Technical Gaps

### Performance:
- No pagination — all prayers load at once (762KB JS bundle)
- No code splitting
- No image optimization

### Security:
- Input validation partial (Zod for submit, not for profile)
- No XSS protection (DOMPurify not installed)
- No rate limiting or spam protection

### Quality:
- No tests whatsoever
- Inline styles throughout instead of CSS classes
- Missing error boundaries
- Tab system in Feed is simplified but some patterns remain

## Infrastructure Roadmap

### v0.2 — Feedback Iteration
- Bug fixes and UX polish from feedback
- Design tokens implementation
- Basic error handling improvements

### v0.3 — In-Person Test Release
- Supabase project setup + database schema
- REST API layer
- Authentication
- PWA setup (manifest, service worker)
- Component restructure

### v1.0 — Public Launch
- CI/CD pipeline (GitHub Actions → Netlify)
- Error monitoring (Sentry)
- Analytics
- Performance optimizations (pagination, code splitting)
- Testing framework + critical path tests

---
*Last Updated: 2026-05-08*
