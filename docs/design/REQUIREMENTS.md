# Active iOS V1 Requirements

Last reviewed: 2026-10-20. These IDs label existing decisions and open launch
stories; they introduce neither new scope nor acceptance claims. Original PWA
requirements remain historical in `docs/specs/`.

## Product Goal And Scope

Help people discover current prayers, pray for others and share needs with an
appropriate audience. Preserve intended access boundaries and make ownership,
reporting and recovery understandable.

First public release: Apple iOS. Web becomes landing/web presence while keeping
necessary auth, shared-link, legal/support and protected operational routes.
Android, multiple Circles, messaging, native push reminders, automatic renewal
and million-prayer scaling are not implicit V1 commitments.

## Functional Baseline

| ID    | Requirement                 | Observable Acceptance                                                                                                                                                                                                                                                                   |
| ----- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01 | Account/session access      | Email/password signup/sign-in, verification guidance, session restoration, sign-out and recovery have clear outcomes; signed-out users cannot enter protected routes.                                                                                                                   |
| FR-02 | Public discovery/map        | Eligible readers browse/search/filter active public prayers. Map points represent coarse places, not device pins; Circle/private content never contributes. Complete location pagination and canonical place identity remain open foundation stories.                                   |
| FR-03 | Submission/ownership        | Authors choose Public, Circle or Private with validation and reliable feedback; only owners edit/delete. Public anonymity changes attribution, not ownership. Circle requires an accepted peer and is not anonymous; Private omits location.                                            |
| FR-04 | Interaction/comments/Notes  | At most one prayer interaction per user/request; counts follow stored interactions. Eligible readers comment/reply under access/settings rules; Private has owner-only Notes. Failure cannot claim success or duplicate counts.                                                         |
| FR-05 | Circle/Updates              | Invite, accept/decline/cancel and remove with consent and a server-enforced 12-peer limit. Updates are recipient-owned and route only to still-accessible content.                                                                                                                      |
| FR-06 | Profiles/preferences/themes | View eligible profiles, edit one's profile/avatar/preferences, preserve username continuity and support light/dark/system themes. Profile editing cannot grant privileged roles.                                                                                                        |
| FR-07 | Sharing/links               | Share/copy eligible URLs with accurate completion/dismissal/error feedback. The app cannot share Private/archived prayers; a link never bypasses auth, membership, expiry, blocks or moderation.                                                                                        |
| FR-08 | Reports/moderation/blocking | Choose a reason and optionally add up to 1000 Unicode code points of details; retain oversized drafts with clear feedback. Explicit moderators review reported targets and record hide/dismiss/restore reasons. Blocking removes relationships and restricts access in both directions. |
| FR-09 | On-demand translation       | Use the saved language, preserve the original and distinguish translated/not-needed/failure. Provider secrets stay server-side; outages do not make originals unreadable.                                                                                                               |
| FR-10 | Deletion/support            | Settings exposes deliberate deletion and legal/support destinations. Server verifies identity before deleting that account; SQL cascades follow declared relationships. Object/provider cleanup and release disclosures cannot be assumed from SQL deletion alone.                      |
| FR-11 | Public lifecycle            | Public prayers are active for 336 hours, then leave discovery without deletion. Owner retains history and may renew an expired, non-hidden public prayer with the same ID, original date, comments and counts. Circle/private do not expire.                                            |
| FR-12 | Service notices             | Separately authorised admins schedule/publish/withdraw bounded informational notices. Banner uses local dates/timezones, supports dismissal and expiry, and never blocks app use on failure.                                                                                            |
| FR-13 | Web/native handoffs         | Preserve landing, policy/support, recovery, protected moderation/notice tools and authorised shared-link fallback during cutover. Verify domain/auth links and native associations before claiming links open the installed app.                                                        |

Active and answered are different concepts. Expiry introduces neither an answered
status nor permanent deletion. Renewal does not reset the original posting date
or promise top-of-feed placement.

## Quality Requirements

The single quality register is [NFR-CHECKLIST.md](../NFR-CHECKLIST.md): NFR-01
security/privacy, NFR-02 reliability/integrity, NFR-03 performance/capacity,
NFR-04 accessibility, NFR-05 monitoring/privacy, NFR-06 recovery, NFR-07 operations
and NFR-08 reproducibility. Budgets are acceptance targets, not measured results.
Do not duplicate or silently relax them in an LLD. Development-only advisory
treatment does not authorise external release.

## From Requirement To Delivery

[TRACEABILITY.md](./TRACEABILITY.md) links requirements to LLDs, existing epics/
stories, implementation, tests and remaining acceptance. Done foundation stories
do not close later safety, scale or signed-build requirements. Scope changes need
an owner decision and design/story/test updates, not automatic new epics.
