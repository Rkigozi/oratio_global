# Oratio Codebase Navigation Guide

Last updated: 2026-09-10

A plain-English map of the Oratio V1 codebase.

## Short Answer

Oratio is a monorepo in an iOS-first migration. `apps/mobile` is the product, `apps/web` is becoming the landing/web presence, `packages/shared` holds cross-platform product logic, and Supabase is the common backend.

## Mental Model

For native work:

1. `apps/mobile/index.ts` registers the Expo entry point.
2. `apps/mobile/App.tsx` registers Supabase, providers, and navigation.
3. `apps/mobile/src/navigation/index.tsx` switches between auth and signed-in navigation.
4. Screens in `apps/mobile/src/screens/` render the native experience.
5. Hooks in `apps/mobile/src/hooks/` own session and screen data state.
6. `packages/shared/src/queries/` talks to Supabase.
7. `supabase/migrations/` defines data and security rules for both clients.

## Important Entry Points

| Area                    | File                                      |
| ----------------------- | ----------------------------------------- |
| Native entry/providers  | `apps/mobile/App.tsx`                     |
| Native navigation       | `apps/mobile/src/navigation/index.tsx`    |
| Native screens          | `apps/mobile/src/screens/`                |
| Native session/feed     | `apps/mobile/src/hooks/`                  |
| Native Supabase adapter | `apps/mobile/src/services/supabase.ts`    |
| Shared domain queries   | `packages/shared/src/queries/`            |
| Shared types/validation | `packages/shared/src/`                    |
| Web entry/routes        | `apps/web/src/main.tsx`, `app/routes.tsx` |
| Database and RLS        | `supabase/migrations/`                    |

## Native Screen Map

Logged out: Login → Sign Up / Reset Password.

Logged in: Public / Map / Prayer Circle / Private / Me tabs → Submit, Prayer Detail, Location Prayers, Prayer Circle Management, Settings, and Updates stack screens. The Public header bell opens Updates; Public includes All/Saved/Country filters, full-feed search, and tappable trending hashtags; Profile is the fifth bottom-tab destination as Me.

## Core Flows → Files

| Flow                   | Native owner                                                 | Shared data owner                            |
| ---------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| Auth/session           | `hooks/auth-context.tsx`, auth screens                       | `queries/profiles.ts`                        |
| Public/circle feeds    | `screens/feed.tsx`, `hooks/use-feed.ts`                      | `queries/prayers.ts`, `queries/saved.ts`     |
| Private prayer library | `screens/private-prayers.tsx`                                | `queries/prayers.ts#getMyPrayers`            |
| Global map / locations | `screens/map.tsx`                                            | `queries/prayers.ts#getMapHotspots`          |
| Submit                 | `screens/submit.tsx`                                         | `queries/prayers.ts`, `validation.ts`        |
| Prayer detail / prayed | `screens/prayer-detail.tsx`                                  | `queries/prayers.ts`, `queries/interactions` |
| Comments/private Notes | `components/prayer-comments.tsx`                             | `queries/comments.ts`                        |
| Circle management      | `screens/prayer-circle-management.tsx`                       | `queries/circle.ts`, `queries/profiles.ts`   |
| Profile/settings       | `screens/profile.tsx`, `screens/settings.tsx`                | `queries/profiles.ts`, Supabase Storage      |
| Updates/live badge     | `screens/updates.tsx`, `hooks/activity-updates-context.tsx`  | `queries/updates.ts`                         |
| Remaining native work  | tracked in JIRA `SCRUM-71`–`SCRUM-75`, `SCRUM-80`–`SCRUM-86` | existing shared query modules                |
| Web migration source   | matching screens under `apps/web/src/app/`                   | thin web re-exports of shared logic          |

## Supabase Map

| Area            | Location                                                                        |
| --------------- | ------------------------------------------------------------------------------- |
| Client adapters | `apps/mobile/src/services/supabase.ts`, `apps/web/src/app/services/supabase.ts` |
| Domain queries  | `packages/shared/src/queries/`                                                  |
| Web shims       | `apps/web/src/app/services/`                                                    |
| Migrations      | `supabase/migrations/` (38, immutable once applied)                             |
| Edge functions  | `supabase/functions/`                                                           |

## Environment Variables

Native: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Web: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`.

## Deploys

Netlify deploys only `apps/web`. Native development currently uses Expo Go;
EAS/TestFlight has not been configured as the release channel yet. The first
public release targets the Apple App Store; Android release work is isolated in
post-launch epic `SCRUM-79`.

## Quality Commands

```bash
npm run type-check
npm run type-check:mobile
npm run lint
npm test
npm run test:mobile
npm run build
npm run test:e2e          # local dev server, mobile + desktop
npm run test:e2e:remote   # live Netlify site
```

Use Node 22 from `.nvmrc`; unsupported Node versions can create misleading Expo/package failures.

## How To Navigate A Future Change

1. Which user flow is affected?
2. Is it native product UI, web presence, or shared logic?
3. Which screen and shared query module own it?
4. Does the database/RLS need a new migration?
5. Which native/web tests should prove it?
6. Does the QA checklist need a row?
