# Tech Context - Oratio Prayer Platform

## Technology Stack

### Core:
- **Frontend**: React 19.0.0 + TypeScript 6.0.2
- **Build**: Vite 6.3.5
- **Styling**: Tailwind CSS 4.1.12 + CSS variables (theme.css)
- **Routing**: React Router 7.13.0
- **Maps**: Leaflet 1.9.4 (React Leaflet)
- **Animations**: Motion (Framer Motion) 12.23.24
- **Icons**: Lucide React 0.487.0
- **Validation**: Zod 4.3.6
- **Drawers**: Vaul 1.1.2

### Backend:
- **Database**: Supabase (PostgreSQL) — 7 tables, RLS, auto-profile trigger
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **Storage**: Supabase Storage (avatars bucket)
- **Edge Functions**: Google Cloud Translation proxy
- **Monitoring**: Sentry 10.57.0 (error tracking)
- **Analytics**: PostHog 1.386.6

### PWA:
- `vite-plugin-pwa` 1.3.0 (Workbox service worker, manifest, precaching)

### Dev Tools:
- **ESLint** 8.57.1 + TypeScript + React + Prettier
- **Prettier** 3.8.1
- **Vitest** 3.2.6 + Testing Library (jsdom)
- **sharp** 0.35.0 (icon generation)

## Database Schema (7 active tables)

| Table | Purpose | Status |
|---|---|---|
| `profiles` | User profiles (id, username, display_name, avatar_url, bio, location) | ✅ Active |
| `prayer_requests` | Prayer content with location, category, prayer_count | ✅ Active |
| `prayer_interactions` | "I prayed" tracking (user_id, prayer_id) | ✅ Active |
| `comments` | Threaded comments on prayers | ✅ Active |
| `reports` | Content moderation reports | ✅ Active |
| `follows` | User follow relationships | ✅ Active |
| `waitlist` | Email subscriptions | ✅ Active |
| `saved_prayers` | Cross-device saved prayers | ✅ Active (new) |

### Removed (dead):
- `push_subscriptions` — no push notification infra
- `tags` column on `prayer_requests` — never populated
- `is_answered`/`answered_at` on `prayer_requests` — no UI
- `language_preference` on `profiles` — never read

## Data Flow
```
UI Components → supabase-queries.ts → Supabase SDK → PostgreSQL
                                       ↕
                              localStorage (legacy fallback)
```

All pages now use Supabase as primary data source, with localStorage as fallback for unauthenticated users.

## Production Build Output
- JS: ~716KB (main) + code-split chunks per route
- CSS: ~52KB
- Service worker: precaches 59 entries (~1.4MB)
- PWA manifest: branded ORATIO icons

## Known Gaps
- 74 lint warnings (floating promises, any types, unescaped entities)
- `feed.tsx` (785 lines) and `supabase-queries.ts` (700+ lines) need splitting
- No component/E2E tests (50 unit tests exist)
- No pagination (loads all 100 prayers at once)
- Inline styles throughout (no CSS variable adoption)
- `oratio-app/` is an empty React Native scaffold

---
*Last Updated: 2026-06-14*
