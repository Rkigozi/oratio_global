# Tech Context — Oratio

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript (strict) + Vite 6 |
| Styling | Tailwind CSS v4, CSS-variable design tokens, DM Sans + Sora |
| Routing | react-router v7 (`react-router` package) |
| State | React contexts + local state (no external store) |
| Backend | Supabase: Auth, PostgreSQL, Storage, Realtime, Edge Functions |
| Maps | Leaflet + React Leaflet wrapper |
| Motion | `motion` (Framer Motion v12) |
| Drawers | `vaul` |
| Monitoring | `@sentry/react`, `posthog-js` (lazy-loaded) |
| PWA | `vite-plugin-pwa` (Workbox), custom recovery in `src/lib/pwa-recovery.ts` |
| Tests | Vitest + Testing Library; Playwright for E2E |
| Lint/Format | ESLint + Prettier |
| CI/CD | GitHub Actions (quality gates) → Netlify (Git-connected deploy) |

## Runtime

- Node 22 (`.nvmrc`, Netlify `NODE_VERSION`, CI all aligned)
- ES2022 target, modern evergreen browsers + iOS Safari

## Environment Variables

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` — set in Netlify production env and GitHub Actions secrets.

## Local Development

- This repo lives on an external drive (Samsung T5), which triggers an npm `uv_cwd` bug — use `./start-dev.sh`
- `npm run dev` runs Vite on 5173 (or next free port)

## Supabase Project

- Single project (URL in `.env`); anon key is public by design
- Migrations in `supabase/migrations/` — apply in order, never edit applied ones
- Edge functions: `translate` (Google Cloud Translation), `delete-account`

## Quality Gates

```bash
npm run type-check && npm run lint && npm test && npm run build
```

- 411 Vitest tests, ~60% line coverage
- E2E: `npm run test:e2e` (local, mobile+desktop) / `npm run test:e2e:remote` (live site)
