# Supporting Website

Owner: `SCRUM-74`; domain/auth/store handoffs also involve `SCRUM-36`-`SCRUM-39`.
Last reviewed: 2026-10-21. Status: planned; scheduled after mobile development acceptance.

## Purpose

The website explains Oratio and supports the iOS product. It is not a second
full prayer app. Later conversion makes the public home an Oratio-branded
information/download page, with screenshots, contact/support and the real App
Store link when available. Before availability, any waitlist/prelaunch message
must be accurate; do not invent a download link or announce a released app.

## What Must Remain

| Responsibility        | Current route/service to preserve or deliberately replace                                    |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Public information    | `/landing` exists; the future public home is `/`                                             |
| Policies/help         | `/privacy`, `/terms`, `/support`                                                             |
| Account recovery      | `/login`, `/reset-password`, `/update-password` and configured Supabase email/auth redirects |
| Shared prayers        | `/prayer/:id`, with authentication and all audience/expiry/blocking checks                   |
| Protected moderation  | `/moderate`, accessible only to authorised moderators                                        |
| Notice administration | `/admin/service-notices`, with its separate server-side admin allowlist                      |
| Native notice service | `/.netlify/functions/service-notice` and its Blobs/configuration boundaries                  |

`/user/:name` is currently an authenticated route; verify inbound uses before
retiring or replacing it. The public feed/map/submit/profile app shell is not a
website feature requirement. Protected admin login does not imply public
website signup or a second web-product roadmap.

The existing [route map](../../apps/web/src/app/routes.tsx) and
[Netlify configuration](../../netlify.toml) describe current deployment contracts.
They still include additional app screens; this document does not claim they
have been removed. Netlify also hosts product-supporting functions, so replacing
the public home must not delete the whole web workspace or its environment.

## Later Cutover Acceptance

- Public `/` shows the website without requiring product login; obsolete public
  app navigation/entry points have deliberate destinations, not broken routes.
- Legal/support, recovery/email redirects, authenticated shared prayers,
  moderator/notice permissions and the native banner endpoint still work.
- Public content matches the actual launch stage and chosen domain; no fake
  availability or claim of verified universal links.
- Browser caching/service-worker updates do not keep serving the previous app
  shell after the switch. Verify existing as well as fresh browser sessions.
- Run relevant web/shared/browser/security checks and verify the approved deploy
  and smoke/alert target. Keep Netlify rollback available.
- Remove unused web dependencies/code only after checking these retained services.

Deployment requires completion of the applicable release stage and change approval. Follow
[release readiness](../V1_RELEASE_READINESS.md) and the
[no-web-deploy controls](./IOS-BUILD-PIPELINE.md#push-and-deployment-scope).
