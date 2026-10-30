# iOS Build Pipeline

Last reviewed: 2026-10-30. Tracking: `SCRUM-72` (distribution), `SCRUM-75` (Apple setup).

## Distribution Status

Mobile V1 implementation and Expo Go acceptance precede TestFlight. Apple
Developer Program membership, signing and release-build approval remain pending.
The development command is `npm run dev:mobile`; the Expo Go workflow does not
require a generated Xcode project or cloud build. See
[release readiness](../V1_RELEASE_READINESS.md) for distribution entry criteria.

## Prepared Configuration

### SDK 58 Development Upgrade (2026-10-26)

The local working tree based on `a3e755a` upgrades Expo 57 to 58.0.19 to match
the installed iOS Expo Go client. The supported matrix comes from the packaged
`expo/bundledNativeModules.json`: React 19.3.0, React Native 0.88.0,
Jest 30/jest-expo 58 and Sentry React Native 8.28.0, with matching native modules.
Root overrides, test renderer, React types and the supporting web workspace share
the same React version. No website feature or deployment is included.

SDK 58 requires Node 22.13+, 24.3+ or a later supported release line; use
`.nvmrc` and the root engine constraint. The composer uses Expo's public UUID
export instead of a direct `expo-modules-core` dependency. Native strict types
remain enabled; modal callbacks, absent FlatList components and test fixtures
were adapted without a legacy-type opt-out or type-check suppression.

Local verification passed: Expo dependency check; Expo Doctor 20/20; both app
type checks; 369 mobile tests/33 suites; 649 web/shared tests/55 files with
coverage; web lint/build; and the CI-style iOS JS/Hermes export (9.9 MB).
All 166 Forge/backport/policy tests passed, including eight new CSR checks for
the SDK's reviewed signing helper. Real Sentry SDK envelope tests retain the
private-content/IP allowlist checks. These are local results, not hosted CI,
provider delivery, physical-device acceptance or signed-build performance.

The upgrade is not committed or pushed by this development step. No database
changes, Xcode generation, EAS build/update, TestFlight or Netlify deployment
are performed. Audit failures remain open in the
[security follow-up](./SECURITY-REVIEW.md#sdk-58-audit-follow-up-2026-10-26);
the existing exception is not expanded. Reload the current Expo Go candidate
and record core-journey, permissions, theme, map and lifecycle smoke results
before accepting the upgraded phone experience.

Sources: [Expo upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
and [SDK 58 release notes](https://expo.dev/changelog/sdk-58).

Phone follow-up (2026-10-27, **maintainer-reported**): the SDK 58 project opens
in iOS Expo Go. The Private-prayer offline/reconnect submission smoke also
passed; [the resilience record](./NATIVE-RESILIENCE.md#device-acceptance)
states its scope and missing device metadata. Wider upgrade/device acceptance,
dependency audits and signed distribution remain open.

Dependency follow-up (2026-10-29/30): the final local candidate uses Expo
58.0.21/React Native 0.88.1, published Forge 1.4.2 and patched supporting web
tooling. Expo Doctor passes 20/20. Clean install, both type checks,
369 mobile tests, 649 web/shared tests, 168 security checks, web lint/build and
the iOS JS/Hermes export pass. The web high/critical audit gate passes; the mobile
gate remains failing on Expo CLI's Zod 3 dependency. The
[security record](./SECURITY-REVIEW.md#dependency-remediation-2026-10-29)
owns the exact findings, artifact evidence and proposed review-only treatment.
The earlier phone checks remain scoped reports against the then-local candidate;
they do not establish complete device or signed-build acceptance.

### Project And Build Profiles

- Linked project: [Oratio Global](https://expo.dev/accounts/oratioglobals-team/projects/oratio-global),
  `@oratioglobals-team/oratio-global`, ID `7a80432c-c964-448f-a42c-b42268268bf3`.
  Existing access/link was verified; do not create a duplicate project.
- App display name Oratio; scheme `oratio`; bundle identifier `com.oratio.app`.
- `apps/mobile/eas.json` requires a clean committed tree and uses remote build numbers.
- `production`: store Release build, EAS production environment, automatic build-number increment.
- `simulator`: internal simulator Release build using preview environment; not a
  physical-device or TestFlight artifact. There is no general device-preview profile.
- `submit.production.ios` is prepared but no App Store Connect identity is invented.
- Post-install public-client configuration/security checks and CI iOS JS export
  exist. They do not prove signing, installation or a working production environment.

Expo project access is separate from the Apple seller identity. The individual
or organisation publishing type and Apple team/app identifiers are not yet
configured. Local environment files are excluded from
build uploads and do not populate EAS environments automatically.

## Push And Deployment Scope

| Action                      | Effect                                                                  |
| --------------------------- | ----------------------------------------------------------------------- |
| Start Metro                 | Expo Go reads the local development bundle                              |
| Git push                    | Saves committed source remotely and may trigger configured CI/web hooks |
| Approved Supabase migration | Changes the shared backend, potentially affecting both clients          |
| Netlify deploy              | Publishes website/functions, not an iPhone app                          |
| iOS JS export               | Checks bundling/assets, not a signed installable binary                 |
| EAS build/submit            | Separate explicit signing/upload actions; not caused by a Git push here |

No automatic EAS Update or signed-build workflow is configured. The review branch
`codex/ios-launch-readiness` and draft PR #5 remain separate from `main`.

For an approved code push **without a website deployment**, preserve `[skip netlify]`
in the PR title (Deploy Previews) and newest pushed commit message (branch/production
deploy for that push). Do not use `[skip ci]`; keep GitHub checks active. This does
not permanently disable Netlify or block separately invoked manual build hooks.
Changes to these controls require an approved website deployment plan.

## Local Verification

Use the Node version in `.nvmrc`. From the repository root:

```bash
npm run type-check:mobile
npm run test:mobile
npm run export:ios --workspace @oratio/mobile
```

For CI-style bundling use nonfunctional client values with `EXPO_NO_DOTENV=1`,
as in `.github/workflows/ci.yml`. `dist/ios` is ignored, not an App Store artifact.
From `apps/mobile`, `npx expo-doctor` checks local compatibility. None of these
commands starts a cloud build or closes device/release acceptance.

Applicable advisory controls are in [SECURITY-REVIEW.md](./SECURITY-REVIEW.md).
The pinned development-only exception expires at `2026-11-13T00:00:00Z` exclusive;
`npm run audit:mobile:release` stays strict. Do not copy historical audit counts
into a current release clearance claim.

## First Signed Build

Entry requires mobile development acceptance and release approval:

1. Activate Apple Developer Program membership and configure the seller identity. Verify
   `com.oratio.app` availability, App Store Connect app and real signing authority.
2. Reverify the existing Expo project/access. Configure public Supabase client
   values in the intended EAS environment; never use `service_role` or `sb_secret_`.
   An environment named preview does not create an isolated database.
3. Confirm the backend/migration target and controlled QA accounts; prepare the
   applicable security/monitoring configuration. Review and commit the candidate.
4. With explicit build approval, run `eas build --platform ios --profile production`
   from `apps/mobile`. Record Git SHA, EAS build ID, version/build and backend target.
5. Submit the verified build separately with `eas submit --platform ios --profile production`.
   Upload is not automatic public App Store release.
6. Install through TestFlight and complete signed-build/device checks. Finish Beta
   gates before external testers, and Launch gates before public submission/release.

Functional evidence is recorded in [QA](../QA-CHECKLIST.md); numeric quality gates
are defined in [NFRs](../NFR-CHECKLIST.md). Distribution prerequisites do not block
the preceding mobile implementation and Expo Go acceptance stage.

References: [Expo iOS store builds](https://docs.expo.dev/deploy/build-project/),
[EAS configuration](https://docs.expo.dev/eas/json/),
[EAS environments](https://docs.expo.dev/eas/environment-variables/),
[TestFlight](https://developer.apple.com/testflight/).
