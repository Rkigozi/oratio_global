# Oratio — Developer Audit Package

> Last updated: June 15, 2026
> Stack: React 19 + TypeScript + Vite + Supabase + Tailwind v4

---

## Executive Summary

Oratio is a production-ready PWA (Progressive Web App) — a global Christian prayer platform. The codebase has been through a full audit and cleanup cycle. Supabase backend is fully integrated. Monitoring (Sentry + PostHog) is live. 50 tests pass. Build, types, and lint all green.

### What's Been Done (April–June 2026)

| Area | Status |
|------|--------|
| Supabase migration (auth, prayers, comments, follows, reports, feed) | ✅ Complete |
| Google OAuth + Email/Password auth | ✅ Complete |
| Edge Function for translation (API key server-side) | ✅ Complete |
| Error Boundary (root-level, Sentry-connected) | ✅ Complete |
| 404 page | ✅ Complete |
| Code splitting (React.lazy on all 21 routes) | ✅ Complete |
| PWA (manifest, service worker, offline fallback, update prompt) | ✅ Complete |
| Privacy (lat/lng rounded to 0.1°, anonymous submissions) | ✅ Complete |
| Input validation (Zod schemas for prayers + profiles) | ✅ Complete |
| Sentry error tracking | ✅ Live |
| PostHog analytics (8 custom events) | ✅ Live |
| Dark/light theme | ✅ Complete |
| Responsive mobile-first design | ✅ Complete |
| Testing (50 tests, Vitest + Testing Library) | ✅ Passing |
| Production build | ✅ Passing (2.7s build time) |
| TypeScript strict mode | ✅ Zero errors |
| ESLint | ✅ 95 warnings (mostly hooks patterns, no errors) |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React 19 | Latest stable |
| Language | TypeScript 6.x | Strict mode |
| Build | Vite 6.3 + SWC | ~2.7s production build |
| Styling | Tailwind CSS v4 | CSS variables for theming, no runtime |
| Routing | React Router v7 | Lazy-loaded routes |
| Backend | Supabase | Auth + PostgreSQL + Edge Functions + Storage |
| Map | Leaflet | Canvas-rendered, no API key needed |
| Animations | motion (Framer Motion) | Spring physics, tree-shakeable |
| Icons | lucide-react | Tree-shakeable |
| Drawers | vaul | Mobile-native bottom sheets |
| Validation | Zod v4 | Schema validation |
| Error tracking | Sentry | `@sentry/react` + `@sentry/browser` |
| Analytics | PostHog (EU) | `posthog-js` |
| PWA | vite-plugin-pwa | Workbox, generateSW mode |
| Deployment | Netlify | Auto-deploy from git, SPA redirects |
| Testing | Vitest + Testing Library + happy-dom | 50 tests, 4 test files |

---

## Project Size

```
src/                           ~10,500 lines of TypeScript/TSX
├── lib/                       15 modules   ~2,600 lines  (auth, queries, validation, etc.)
├── app/components/            10 components ~1,200 lines  (reusable UI)
├── app/pages/                 21 pages      ~6,300 lines  (route components)
├── app/data/                  2 files       ~625 lines    (types, mock data, legacy profile)
├── styles/                    3 files       ~430 lines    (Tailwind, theme, animations)
├── test/ setup                1 file
├── main.tsx                   Entry point (Sentry + PostHog init)
└── sw.ts                      Service worker

dist/ (production build)       68 precached entries, ~1.5 MB total
```

---

## Architecture

### Routes
- **Public** (no layout): `/landing`, `/onboarding`, `/login`, `/reset-password`, `/update-password`, `/privacy`, `/terms`, `/prayer/:id`, `/moderate`, `/user/:name`, `/user/:name/following`, `/user/:name/followers`
- **App shell** (Header + BottomNav): `/` (map), `/feed`, `/submit`, `/profile`, `/profile/submitted`, `/profile/prayed`, `/profile/saved`, `/profile/settings`, `/info`
- **Catch-all**: `*` → 404 page

All routes are code-split via `React.lazy()`.

### Data Flow
- Primary: **Supabase** (8 tables: profiles, prayer_requests, prayer_interactions, comments, follows, saved_prayers, reports, waitlist)
- Fallback: **localStorage** (16 keys, mostly for optimistic updates and legacy compatibility)
- Real-time: **CustomEvents** (`oratio-prayer-added`, `oratio-prayer-removed`) dispatched on `window`
- Mock data: `prayer-data.ts` generates deterministic test data from a 26-city database (only used in tests, tree-shaken from production)

### Auth
- Supabase Auth with Email/Password + Google OAuth
- Auth state managed via React Context (`auth-context.tsx`)
- Session persisted automatically by Supabase client
- Profile auto-created via DB trigger on signup

### Key Dependencies (Production)
`@sentry/react`, `@supabase/supabase-js`, `leaflet`, `lucide-react`, `motion`, `posthog-js`, `react`, `react-router`, `vaul`, `zod`

Total: ~14 production dependencies, ~20 dev dependencies.

---

## Database Schema (Supabase)

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User profiles (auto-created on signup) | SELECT: all, UPDATE: own |
| `prayer_requests` | Prayer submissions with location | SELECT: all, INSERT: auth'd, DELETE: owner |
| `prayer_interactions` | "I prayed" tracking | SELECT: all, INSERT/DELETE: own |
| `comments` | Threaded comments on prayers | SELECT: all, INSERT: auth'd, DELETE: own |
| `follows` | Follow relationships | SELECT: all, INSERT/DELETE: own |
| `saved_prayers` | Bookmarked prayers | SELECT/INSERT/DELETE: own |
| `reports` | Content moderation reports | INSERT: all, SELECT: own, UPDATE: mod |
| `waitlist` | Email waitlist signups | INSERT: all |

### Edge Functions
- `translate` — Google Cloud Translation proxy (API key server-side)
- `delete-account` — Server-side user data deletion
- `send-push-notification` — Web push notifications (for future use)

---

## Monitoring

| Service | Purpose | Access |
|---------|---------|--------|
| Sentry | Error tracking | https://sentry.io/organizations/oratio-3j/issues/ |
| PostHog | Product analytics | https://eu.posthog.com/project/ |

Custom PostHog events: `user_signed_up`, `user_signed_in`, `prayer_submitted`, `prayer_prayed`, `prayer_unprayed`, `prayer_saved`, `prayer_unsaved`, `prayer_reported`, `comment_added`, `search_performed`

---

## Security

- **XSS**: Zod regex validation (`/^[\p{L}\p{N}\p{P}\p{Z}]+$/u`) strips unsafe characters; HTML tags removed via `sanitizePrayerText()`
- **Privacy**: Lat/lng rounded to 0.1° (~11km) before storage; anonymous submission option
- **Auth**: Supabase RLS policies on all tables; OAuth via Google
- **API keys**: Google Translate key is server-side only (Supabase Edge Function secret); Supabase anon key is publishable-by-design
- **Headers**: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy configured in `netlify.toml`

---

## Performance

| Metric | Status |
|--------|--------|
| Build time | ~2.7s |
| Total bundle (gzip) | ~1.5 MB (68 entries) |
| Largest chunk | 720 KB (vendor/libs) — exceeds 500 KB advisory |
| Code splitting | ✅ Per-route lazy loading |
| Infinite scroll | ✅ Feed loads 20 at a time via IntersectionObserver |
| Image optimization | ❌ No WebP, no lazy loading |
| Map marker clustering | ❌ All markers render individually |
| LCP / FID / CLS | ❌ Not measured |

---

## Testing

| Type | Count | Framework |
|------|-------|-----------|
| Unit tests | 50 | Vitest + Testing Library |
| Component tests | 0 | Not yet |
| Integration tests | 0 | Not yet |
| E2E tests | 0 | Not yet |

---

## Known Issues & Limitations

1. **Bundle size**: Main vendor chunk is 720 KB (advisory threshold is 500 KB). Could split via `manualChunks` in Rollup.
2. **No pagination on map**: Home page loads all prayer hotspots at once via `getMapHotspots()` (limit 200). Fine for beta but won't scale.
3. **No skeleton loaders**: All loading states use spinners instead of skeleton screens.
4. **No image optimization**: Avatars are base64 data URLs or UI Avatars API calls. No WebP, no responsive images.
5. **No map marker clustering**: All hotspots render as individual circle markers.
6. **LocalStorage dual-write**: Several features still write to both Supabase and localStorage as fallback. Cleanup deferred.
7. **No component/E2E tests**: Only unit tests exist.
8. **CSP header missing**: `Content-Security-Policy` not configured in `netlify.toml`.

---

## Environment Variables

```env
VITE_SUPABASE_URL=                           # Supabase project URL
VITE_SUPABASE_ANON_KEY=                      # Supabase anon/public key
VITE_SENTRY_DSN=                             # Sentry DSN (error tracking)
VITE_POSTHOG_KEY=                            # PostHog API key (analytics)
VITE_POSTHOG_HOST=                           # PostHog host (https://eu.posthog.com for EU)
```

---

## Development Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run type-check       # TypeScript check (tsc --noEmit)
npm run test             # Run all tests (vitest)
npm run lint             # ESLint check
npm run format           # Prettier format
```

---

## File Map (src/)

```
src/
├── main.tsx                      # Entry — Sentry + PostHog init
├── sw.ts                         # Service worker (Workbox)
├── lib/
│   ├── supabase.ts               # Supabase client
│   ├── auth-context.tsx           # Auth state + methods
│   ├── supabase-queries.ts       # All DB CRUD (826 lines)
│   ├── api.ts                    # Report wrappers
│   ├── validation.ts             # Zod schemas + sanitizer
│   ├── theme-context.tsx         # Dark/light theme
│   ├── translate.ts              # Translation via Edge Function
│   ├── use-geolocation.ts        # Geo API + Nominatim
│   ├── hashtags.tsx              # Hashtag utilities
│   ├── logger.ts                 # Error logging (console + Sentry)
│   ├── upload.ts                 # Avatar handling
│   └── username.ts               # Username generator
├── app/
│   ├── App.tsx                   # Root providers + UpdatePrompt
│   ├── routes.tsx                # Route definitions
│   ├── components/               # 10 reusable components
│   └── pages/                    # 21 route pages
├── styles/                       # Tailwind v4, theme, animations
└── test/                         # Test setup
```
