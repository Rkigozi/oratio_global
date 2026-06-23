# Active Context

## Current Focus
Production cleanup and hardening for v1.0 launch. All major features are complete. Remaining work is pre-launch checklist items.

## Recent Changes (June 22, 2026)
- Removed all localStorage dead code (oratio_profile, oratio_comments, oratio_last_prayer_location)
- Removed category system entirely (hashtags replace it)
- Fixed CSP multi-line issue (was causing SW SecurityError on iOS Chrome)
- Fixed comment input: maxLength 500, auth gate, error preservation
- Added comment pagination (20 per page, Load More)
- Added comment_count DB trigger for feed display
- Fixed feed avatars (profile join for avatar_url)
- Upload avatars to Supabase Storage instead of base64 DB blobs
- Fixed profile prayers navigating to /prayer/:id (shows comments)
- Added Followers count to profile stats (replaced Saved)
- Fixed "Following" feed filter (was comparing UUIDs vs usernames)
- Added cursor-based feed pagination (no more loading 100 at once)
- Added rate limiting: 10 prayers/hr, 30 comments/hr (RLS)
- Added Playwright E2E smoke tests
- Added UPDATE RLS policy for reports (fixed moderation page)
- Added ownership checks to deleteComment and deletePrayerRequest
- Added self-follow guard
- Added deploy preview config for Netlify

## Known Issues
- OG image URLs in index.html point to oratiotest.netlify.app (needs updating when domain purchased)
- Password reset flow not tested end-to-end
- Privacy/terms pages need content verification

## Next Session
- Pre-launch checklist (4 items in BACKLOG.md)
- Custom domain setup
- PostHog dashboard creation
