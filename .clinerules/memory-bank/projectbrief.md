# Project Brief — Oratio

## Identity

- **Product**: Oratio — a global Christian prayer platform
- **Current state**: V1 release candidate, deployed at https://oratiotest.netlify.app
- **Form**: Web PWA (installable), mobile-first
- **Backend**: Supabase (Auth, PostgreSQL + RLS, Storage, Edge Functions, Realtime)

## Core Purpose

Connect people through shared prayer: submit prayer requests, pray for others, encourage through comments, and share privately through the Prayer Circle.

## Core Loop

submit → feed → pray → comment → updates → return

## Product Surface

- Map of global prayer hotspots (privacy-safe, city-level aggregation)
- Public feed with search, saved prayers, and location filters
- Prayer detail with "I Prayed", comments/replies, translation, sharing, reporting
- Prayer Circle: private mutual connections with circle-only prayers
- Profile: stats, prayer library, avatar, settings
- Updates inbox for comments, replies, circle events, report outcomes
- Moderator report-review queue

## Success Criteria

- Users submit prayers and receive "I Prayed" responses
- Engagement across locations and repeat visits
- Prayer Circle retains its early adopters

## Constraints

1. **Privacy first** — never store exact locations; city/country only
2. **One deploy pipeline** — Netlify Git-connected; CI is quality gates only
3. **No dead weight** — features shipped must be maintained; cut what is not used
4. **Launch something real, not perfect** — V1 scope is complete; improvements queue post-launch

## Out Of Scope (deliberately deferred)

- Push notifications (schema exists but no client)
- Messaging/DMs
- Monetisation
- Native apps (Expo/React Native was considered and shelved; the PWA is the product for now)
