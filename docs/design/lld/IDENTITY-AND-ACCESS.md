# LLD: Identity And Access

Last reviewed: 2026-10-20. Requirements FR-01/FR-06; quality NFR-01/02/04/08.
Parent: [HLD](../../ARCHITECTURE.md). Delivery: [traceability](../TRACEABILITY.md).

## Ownership And Records

Supabase Auth owns credentials and session tokens. `profiles.id` corresponds to
the Auth user; signup provisioning is handled by database triggers. Profiles
contain public-facing username/display/avatar fields and saved preferences, not
client-editable moderator authority. SQL grants restrict profile update columns.

`profile_username_aliases` reserves historical usernames and maps old profile
links to the same profile. Migration 036 normalises/reserves names; 041 makes
resolution respect blocking. Alias records are not a client-editable directory.

## Session And Navigation

```text
app starts -> register Supabase adapter -> AuthProvider restores session
  -> loading: neutral loading view
  -> no session / restore failure: auth stack
  -> session user: signed-in tabs + stack; profile loads separately
auth event / sign-out -> update user/profile -> navigation switches
```

The native client persists sessions in AsyncStorage, automatically refreshes
tokens while active and stops auto-refresh in the background. URL session
detection is disabled. Initial session restore has a five-second timeout so a
failure cannot leave the loading view indefinitely. Profile failure is not a
new anonymous identity; it does not grant data access.

Profile/session request generations prevent stale restore/profile results from
replacing a newer account or repopulating state after logout. Changing identity
clears the previous profile; the keyed activity/navigation subtree remounts its
account-scoped screens and drafts. Sign-out clears visible state immediately and
uses the SDK's local scope for this device. Another account's stale token refresh
cannot replace the current identity. Transport/logical deadlines bound the changed
auth/profile operations; a timeout is not evidence of token revocation.

Sign-up supplies username metadata to Supabase and shows email-verification
guidance when required. Sign-in returns the provider error, a recoverable network
message, or success. Uncertain sign-up/reset feedback advises checking email before
another email-producing action. Recovery sends a web
`/update-password` link using the current configured web destination. Launch
domain/allowlist changes belong to `SCRUM-37`, not a new native REST endpoint.

AsyncStorage use is an as-built fact, not a claim of encrypted credential storage
or a complete session/cache race audit. Token handling, stale asynchronous
profile responses, account changes and access revocation still require the
NFR-01/02 signed-build review. The [resilience record](../../backlog/NATIVE-RESILIENCE.md)
owns the local checkpoint and remaining evidence. Do not describe all device caches as remotely erased
when a session/relationship is revoked.

## Profile And Preference Contracts

| Operation            | Shared / Platform Contract                                                             | Result                                                                        |
| -------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Read own profile     | `getMyProfile`, authenticated row lookup                                               | Own profile or null                                                           |
| Resolve profile link | `getProfileByUsername`, alias RPC plus profile data                                    | Current profile or unavailable; block restrictions still apply                |
| Search people        | `searchUsers`, bounded username lookup                                                 | Up to 20 candidates, subject to RLS                                           |
| Edit profile         | `updateProfile`, allowed own columns only                                              | Boolean outcome; refresh auth profile after success                           |
| Preferences          | `getProfilePreferences` / `updateProfilePreferences`                                   | Saved language, location/theme and update preferences; not privilege settings |
| Avatar               | Native picker -> upload to `avatars/<user-id>/<timestamp>.<ext>` -> update profile URL | Uploaded/cancelled/error, with cancellation distinct from failure             |

Native avatar selection requests photo-library permission on use, crops to square
and rejects a known source size above 12 MB. The adapter prepares bytes/MIME and
returns a public avatar URL; object write policies remain independent of profile
table RLS. This bucket is not a private prayer/document store. Replaced image and
account-deletion object cleanup are separate lifecycle review items, not proved
by setting `avatar_url`.

Theme selection supports light/dark/system through the native theme provider;
Settings is launched from Me. Other-profile actions use the actions sheet for
blocking and the Circle component for consent-based invitations. There is no
normal-user moderation-role toggle.

## Source And Verification

- [Client registration](../../../packages/shared/src/client.ts),
  [native client](../../../apps/mobile/src/services/supabase.ts),
  [Auth provider](../../../apps/mobile/src/hooks/auth-context.tsx),
  [navigation](../../../apps/mobile/src/navigation/index.tsx).
- [Profile queries](../../../packages/shared/src/queries/profiles.ts),
  [username rules](../../../packages/shared/src/username.ts),
  [avatar adapter](../../../apps/mobile/src/services/avatar-upload.ts),
  [theme provider](../../../apps/mobile/src/hooks/theme-provider.tsx).
- Schema: [profile role protection](../../../supabase/migrations/015_moderator_report_policies.sql),
  [username continuity](../../../supabase/migrations/036_username_continuity.sql),
  [blocked resolution](../../../supabase/migrations/041_user_blocking.sql),
  [avatar policies](../../../supabase/migrations/002_storage_policies.sql).
- Tests: [auth lifecycle](../../../apps/mobile/src/hooks/auth-context.test.tsx),
  [profile](../../../apps/mobile/src/screens/profile.test.tsx),
  [other profile](../../../apps/mobile/src/screens/user-profile.test.tsx),
  [Settings](../../../apps/mobile/src/screens/settings.test.tsx),
  [themes](../../../apps/mobile/src/hooks/theme-context.test.tsx),
  [username](../../../apps/web/src/lib/username.test.ts),
  [DB security](../../../supabase/tests/security.sql).

Run `npm run test:mobile`, `npm test`, both type checks and `npm run test:db` for
behavior changes. Device acceptance includes expired-session recovery, account
switches, permission denial/cancellation, alias links, both themes and accessibility.
Ownership: `SCRUM-65/70/77/80`; remaining session/security/accessibility proof:
`SCRUM-47/95/96`, with release acceptance under `SCRUM-40`.
