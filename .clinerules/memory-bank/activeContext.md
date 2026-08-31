# Active Context

## Current Focus

V1 launch preparation. The product is feature-complete and hardened; the recent work was a **pre-launch cleanup and audit**:

1. **Deploy consolidation** — removed the manual GitHub Actions deploy; Netlify Git-connected deploys are now the single pipeline. Added `VITE_POSTHOG_KEY` to Netlify env (PostHog was silently disabled on Netlify builds).
2. **Auth simplification** — Google OAuth removed from UI and code; email/password only. (Re-enable later if needed.)
3. **Dead code removal** — deleted `services/api.ts` wrapper, moved mock data into `src/test/mocks/`, removed the unused shadcn/Base UI layer (`components/ui`, `components.json`, `@base-ui/react`, `class-variance-authority`, `tw-animate-css`, `shadcn`).
4. **Code structure** — split `supabase-queries.ts` (1,586 lines) into domain modules under `services/queries/`; split `feed.tsx` into `use-feed-data`/`use-feed-search` hooks + `feed-scroll-snapshot`; split `comment-section.tsx` into `comment-thread.tsx`; extracted dialogs and drawer from `prayer-detail.tsx`/`profile.tsx`.
5. **Testing** — added component tests for the previously-untested UI (header, world map, moderate, landing, update-password, profile), integration tests (feed↔submit events, activity-updates context), and real Playwright journeys (mobile + desktop). Coverage ~44% → ~60%; 350 → 411 unit tests; E2E grew from 3 smoke tests to 38.
6. **Docs** — full refresh: README, memory bank, navigation guide, release readiness, QA checklist. Stale docs archived under `docs/archive/`.

## What Changed Recently (last 2 weeks)

- One deploy pipeline: `git push` → Netlify. Rollbacks via Netlify UI.
- PostHog now receives production events.
- Google sign-in buttons removed from login/onboarding.

## Known Issues / Watch Items

- OG image URLs in `index.html` still point to `oratiotest.netlify.app` — update when a custom domain exists
- Password reset email flow needs an end-to-end check once (manual)
- Android physical-device testing deferred; mobile Chrome/WebKit used as proxy

## Next Up

- Post-launch: drop unused tables (`waitlist`, `push_subscriptions`, `follows`) via migration 037
- Post-launch: bundle analysis (HEIC chunk), Lighthouse, RLS audit
- Custom domain + Netlify site rename (oratio site) when ready
- Decide Prayer Circle prominence based on real usage data
