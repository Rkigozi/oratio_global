# iOS Build Pipeline

Last updated: 2026-10-20. Jira: `SCRUM-72`; Apple account prerequisite: `SCRUM-75`.

## Current State

Local build preparation is implemented in the local checkpoint, not distributed. No EAS
project was created, signing credentials generated, cloud build started, or Apple
submission made. The app is linked to the existing team project with owner approval.
A local Debug binary was built and opened on the iPhone 17 simulator on 2026-09-30;
the owner subsequently discontinued the local Xcode preview and kept Expo Go as
the day-to-day workflow. This was not a TestFlight or physical-device build.
Android remains post-launch under `SCRUM-79`.

- `apps/mobile/eas.json` defines store and simulator Release builds.
- Production uses the EAS `production` environment and remote build-number
  increments. `requireCommit` requires a clean committed tree before building.
- Simulator builds use `preview`, internal distribution and no build-number
  increment. They are not installable TestFlight builds.
- The post-install hook rejects missing/malformed Supabase client configuration
  and accidental server keys without logging credential values.
- CI checks iOS JS/Hermes bundling with nonfunctional placeholder client values;
  it does not sign, upload or distribute an app.
- Expo SDK 57 patch dependencies are aligned. The native configuration keeps
  photo-library and foreground-location messages, with unused camera/microphone
  permissions disabled. Confirm the actual permission journey in the first binary.

## Expo Access and Apple Setup

Browser authorization through EAS CLI 24.8.0 completed on 2026-09-29. The CLI is
now signed in as `oratio_global`, with Owner access to the personal account and
`oratioglobals-team`. The login/access prerequisite is complete; this does not
enroll anyone with Apple or start a build.

A read-only, fully paginated inventory found no projects under `oratio_global`
and one existing project under `oratioglobals-team`:

- Project: [Oratio Global](https://expo.dev/accounts/oratioglobals-team/projects/oratio-global)
- Full name: `@oratioglobals-team/oratio-global`
- Project ID: `7a80432c-c964-448f-a42c-b42268268bf3`
- No builds, build profiles or connected GitHub repository were returned.

With explicit owner approval, `apps/mobile/app.json` now uses owner
`oratioglobals-team`, slug `oratio-global` and the verified project ID above in
`extra.eas.projectId`. EAS CLI 24.8.0 `project:info` resolved that exact full name
and ID from the mobile workspace. No remote project was created, transferred or
renamed. Display name `Oratio`, scheme `oratio` and iOS bundle identifier
`com.oratio.app` are unchanged. The build-config tests protect this mapping.
Expo ownership is separate from the Apple seller identity.

Apple Developer membership is not active. The owner confirmed there is no
registered Oratio company yet; individual versus organisation publishing remains
their decision. Do not invent company details, Apple team IDs or App Store IDs.

## Local Checks

Use a supported Node LTS version (22.13+ or 24.3+), not the machine's Node 23.
From the repository root:

```bash
npm run type-check:mobile
npm run test:mobile
npm run export:ios --workspace @oratio/mobile
```

From `apps/mobile`:

```bash
node --env-file=.env scripts/check-build-env.cjs
npx expo-doctor
```

An export validates JavaScript, Hermes bytecode and assets, not native compilation,
signing, installation or runtime behaviour. `dist/ios` is ignored and must not be
treated as an App Store artifact. The export script clears Metro's cache so a
changed client environment cannot reuse previously inlined values. EAS commands also run from `apps/mobile`, with
the root workspace lockfile retained in the build archive.

## Push And Deployment Scope

A Git push saves committed source remotely; it is not an EAS build, EAS Update,
TestFlight submission or App Store release. Expo Go loads the local Metro bundle
and does not require a Git push to show local changes. No EAS Update workflow or
automatic signed-build workflow is configured in this repository.

For the owner's 2026-10-20 push without a web deployment:

- Keep `codex/ios-launch-readiness` separate from `main` and PR #5 in draft.
- Include `[skip netlify]` in the PR title to suppress Deploy Previews and in the
  newest pushed commit message to suppress branch/production deploys for that
  push. Use Netlify's marker, not `[skip ci]`, so GitHub CI still runs normally.
- Keep web/mobile/database checks enabled. Testing web compatibility is not
  publishing the website; shared/backend changes can affect both clients.
- Do not start an EAS build/update or submit to Apple without selecting that
  separate release action and verifying its prerequisites.

The markers do not permanently disable the site or alter its configuration.
Future web previews need the PR title marker removed; future branch deploys need
a new commit without the marker. Manual build hooks are a separate action.
See [Netlify's deploy controls](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/).

## First Signed Build

1. Verify the existing link with `npx eas-cli@24.8.0 project:info` from `apps/mobile`.
   It must resolve `@oratioglobals-team/oratio-global` and the project ID above.
   Do not create a duplicate or move the project to the personal account.
2. Complete the chosen Apple enrollment path and App Store Connect setup. Verify
   `com.oratio.app` is available to that team before registering it. Configure real
   signing credentials and the matching App Store Connect app record with approval.
3. Configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the
   EAS `production` and `preview` environments. The latter accepts a publishable
   key or existing legacy anon JWT. Never use `service_role` or `sb_secret_` keys.
   These client values are bundled publicly; RLS enforces access. Local `.env`
   files and signing files are excluded from uploads.
4. Verify the target backend and QA accounts. An EAS environment named `preview`
   does not create a separate Supabase database. Complete remaining safety QA,
   native observability (`SCRUM-43`) and dependency-advisory review before external beta.
5. Review and commit the exact release candidate, then explicitly start the build:

   ```bash
   eas build --platform ios --profile production
   ```

6. Record Git SHA, EAS build ID, version/build number and backend target. Submit
   separately with `eas submit --platform ios --profile production`, selecting the
   verified build ID. There is no auto-submit or automated App Store review release.
7. Invite internal testers and verify installation, launch, auth, permissions,
   public/Circle/private isolation, moderation and blocking on a physical iPhone.
   Record evidence in `docs/QA-CHECKLIST.md`. Test reinstall and upgrade before go/no-go.

Optional simulator builds use `eas build --platform ios --profile simulator` after
project/environment setup and explicit build approval.

## Local Simulator Checkpoint (Closed)

On 2026-09-30, Xcode 26.6 with Node 24.19.0 successfully compiled the native Debug
app, installed `com.oratio.app` and opened its rendered sign-in screen on iPhone 17
(iOS 26.5). The build reported zero errors and one duplicate `-lc++` linker warning.
No Apple account, distribution credentials, cloud build, physical-device
installation or upload was needed.

The first build inside the Desktop checkout failed because the generated
`ExpoModulesJSI.framework` acquired `com.apple.FinderInfo` metadata, which code
signing rejects. A temporary build copy outside Desktop allowed the preview to
complete without weakening signing or changing dependencies.

At the owner's request on the same day, the Xcode workspace was closed and the
iPhone 17 simulator was shut down. The temporary build copy, generated
`apps/mobile/ios/` project and that copy's Xcode DerivedData were moved to Trash
for recoverability. The original Desktop checkout was not moved, its Expo Go
scripts and client configuration are preserved, and the existing Metro server
was left running. Xcode remains installed; no global developer-directory change
was made. Continue normal development with `npm run dev:mobile` and Expo Go.

Login, authenticated journeys, native permissions, Release performance and all
physical-device/TestFlight release gates remain unverified by this launch check.

## Verification and Open Risks

Current checkpoint (2026-10-07): Expo `57.0.27`, Doctor 21/21, 255 mobile tests,
534 web tests, both type checks, web lint/build and a clean CI-style iOS export
passed. Local browser regressions passed 38 tests with six authenticated tests
skipped. No signed build, Xcode preview or new device test was started.
The mobile production audit still reports seven moderate and 14 high
affected-package entries (zero critical). The subsequent tooling follow-up removed
all critical entries; the full tree including development tools retains 12 moderate
and 45 high entries. The clean exported JavaScript source map contains none of the
remaining advisory packages; build-time risk and signed-artifact review remain open.
See [the security review](./SECURITY-REVIEW.md)
for the current blocker and [release readiness](../V1_RELEASE_READINESS.md)
for verification scope. The older snapshots below do not clear these findings.

On 2026-09-29, EAS 16.28.0 resolved both build profiles and the submit profile
offline; Expo Doctor passed 21/21 checks; mobile type-check and 224 tests passed;
iOS export bundled 3,051 modules and 22 assets. Native config introspection confirmed
the requested permission messages and absence of camera/microphone/background-location
usage descriptions. None of this closes physical-device release QA.

The clean CI-style export with local dotenv disabled was also inspected for the
nonfunctional CI client URL/key. Web regression tests (485), web type-check,
lint/build and repository formatting passed. Web tests still emit a React
set-state-during-render warning in the prayer-detail test; the web build warns
about large chunks. Browser E2E and native binary/device checks were not run here.

On 2026-09-30, targeted compatible patches removed the vulnerable navigation
decoder and updated brace-expansion. Mobile tests (231), web tests (485) and iOS
export passed. That September production audit reported **10 moderate findings and
no high/critical**, all propagated through the remaining UUID build-tool chain.
See [SECURITY-REVIEW.md](./SECURITY-REVIEW.md) for current evidence and the separate
database hardening migration awaiting deployment. Historical 2026-09-29 findings:

- React Navigation's `query-string@7.1.3` depends on affected
  `decode-uri-component@0.2.2`. The [upstream advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)
  fixes malformed-input CPU exhaustion in 0.5.0, outside the current dependency
  range. This dependency was removed by the tested React Navigation core 7.23.0
  lockfile update on 2026-09-30; no parser override was needed.
- Expo's build-tool chain includes `xcode` / `uuid@7.0.3`. The
  [UUID advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) concerns supplied
  buffers in v3/v5/v6; the inspected Xcode helper calls v4 without a buffer.
  That narrows the observed exposure but does not clear the audit. Track upstream
  remediation; do not apply npm's suggested downgrade to Expo 46 or force a major override.

The remaining blocking privacy, failure/retry and theme checks stay open in
[USER-BLOCKING.md](./USER-BLOCKING.md). Full launch gates remain in
[V1_RELEASE_READINESS.md](../V1_RELEASE_READINESS.md).

References: [Expo monorepo builds](https://docs.expo.dev/build-reference/build-with-monorepos/),
[EAS configuration](https://docs.expo.dev/eas/json/),
[EAS environment variables](https://docs.expo.dev/eas/environment-variables/).
