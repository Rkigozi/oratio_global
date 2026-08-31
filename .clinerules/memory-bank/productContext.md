# Product Context — Oratio

## What Oratio Does

A person anywhere in the world shares a prayer need. Others see it on a map or feed, tap "I Prayed", and can leave encouragement in comments. Private relationships are handled by the Prayer Circle (mutual invites, circle-only prayers). An updates inbox tells users when someone reacted.

## Users

- **Anonymous visitors** — see the landing page and legal pages only; everything else redirects to login
- **Members** — email/password accounts (Google OAuth intentionally disabled for V1)
- **Moderators** — trusted members flagged `is_moderator` in Supabase; access `/moderate`

## Core Journeys

1. **Onboarding** — landing → create account (email, password, username) → email verification → feed
2. **Submit** — text (10–500 chars) + location (city/country) + audience (public/circle/private) + anonymous toggle
3. **Pray** — "I Prayed" toggles a `prayer_interactions` row and increments the counter
4. **Comment** — public prayers with comments enabled; author can toggle comments off; edit/delete/report
5. **Prayer Circle** — invite by username → accept → circle-only prayers visible to members
6. **Update tracking** — activity events surface in `/updates` with an unread badge in the header

## Safety & Trust

- Reporting: prayers and comments are reportable; duplicate pending reports are prevented
- Moderation: review queue at `/moderate` with resolve/dismiss + audit trail
- Crisis resources surfaced on relevant screens
- Rate limits: 10 prayers/hour, 30 comments/hour (DB level)
- Privacy: exact coordinates never stored; usernames only in public attribution

## Analytics Events (PostHog)

`user_signed_up`, `user_signed_in`, `user_signed_out`, `prayer_submitted`, `prayer_prayed`, `prayer_saved`, `prayer_reported`, `comment_added`, `search_performed`, `password_reset_requested`, `password_updated`, `prayer_edited`.

## Languages

On-demand translation via a Supabase edge function (Google Cloud Translation). The feed and prayer detail offer translate for non-native text.

## Notifications Philosophy

No push notifications yet. The updates inbox + header badge is the in-app notification surface.
