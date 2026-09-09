# Project Brief — Oratio

## Identity

- **Product**: Oratio — a global Christian prayer platform
- **Strategy**: iOS-first. The iOS app (Expo/React Native) is the product; the web PWA becomes the landing/marketing site.
- **Distribution**: TestFlight beta, then the App Store (requires Apple Developer Program, $99/yr — enrol when TestFlight-ready)
- **Backend**: Supabase (Auth, PostgreSQL + RLS, Storage, Edge Functions, Realtime) — shared by web and iOS

## Repo

Monorepo (npm workspaces): `apps/web` (React PWA → landing), `apps/mobile` (Expo iOS), `packages/shared` (queries, validation, types). Backend schema in `supabase/`. JIRA project `SCRUM` at oratio.atlassian.net — active sprint `V1 Launch`.

## Core Purpose

Connect people through shared prayer: submit prayer requests, pray for others, encourage through comments, and share privately through the Prayer Circle.

## Core Loop

submit → feed → pray → comment → updates → return

## Product Surface (parity target between web and iOS)

- Feed with search, saved prayers, and location filters
- Prayer detail with "I Prayed", comments/replies, translation, sharing, reporting
- Submit with audience (public / circle / private) and anonymous options
- Prayer Circle: private mutual connections with circle-only prayers
- Profile: stats, prayer library, avatar, settings
- Updates inbox; moderator report-review queue

## Success Criteria

- TestFlight build installed and used by real iOS users
- Core loop works end-to-end in the app
- Landing page converts visitors to the App Store

## Constraints

1. **Privacy first** — never store exact locations; city/country only
2. **One backend** — Supabase for both platforms
3. **Reuse before rewrite** — shared logic lives in packages/shared
4. **No ceremony** — solo dev: priorities + versions, not sprints/points (single V1 Launch sprint is the exception)

## Out Of Scope (deliberately deferred)

- Push notifications (until the app is in TestFlight)
- Messaging/DMs
- Monetisation
- Android (after iOS proves the loop)
