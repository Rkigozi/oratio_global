# iOS Launch Security Review

Last updated: 2026-10-14. Jira: [SCRUM-47](https://oratio.atlassian.net/browse/SCRUM-47).
Status: **In Progress**, not security sign-off. Supports NFR-01 in
[the NFR checklist](../NFR-CHECKLIST.md).

## Approved Development Mitigation (2026-10-14)

The release owner explicitly approved proceeding with the scoped approach after
the explanation of the tested Forge backport and a 30-day exception for known
tooling findings. This changes the earlier **no waiver/no installed backport**
state for development review only. It is not public-release approval, and does
not authorize a live migration, signing/build purchase, deployment or merge.

- The exact canonical RSA diff is applied to the Node implementation of every
  present lockfile-listed `node-forge@1.4.0` during root npm `postinstall`.
  SHA-256 is checked before/after, repeated installs are idempotent, unknown/local
  source changes are preserved, and upstream version changes require review.
  The installed RSA hash is
  `c7b72e7ef41f4fc0e5228dce3e37851e9ca064c789365d5e392c25d1c5f6e710`.
- The mobile EAS post-install hook verifies the backport before its existing
  configuration check. Hook wiring is not evidence of an actual EAS/native build.
- The owner-approved policy activates at `2026-10-14T00:00:00Z` and expires at
  `2026-11-13T00:00:00Z` (exclusive), a maximum of 30 days. It covers only
  `GHSA-vfj7-8cjw-p6xm` and `GHSA-86w9-cpqp-85rv`, the pinned current versions,
  install paths and the 14 recorded high-severity parent entries. It requires the
  verified Node patch. This is bounded build-tool risk acceptance, not a claim
  that braces or Forge's browser distribution bundles are fixed.
- All raw findings/counts remain printed. Critical/new high advisories, new
  parents/paths/versions, missing/tampered source, incomplete/error reports and
  expired approvals fail closed. Actual Metro dependency cycles are traversed
  without discarding reachable advisory leaves. Moderate findings remain
  reported and unwaived; the existing high/critical threshold is unchanged.
- `audit:mobile` is the development/code-review policy gate;
  `audit:mobile:raw` preserves the original npm command;
  `audit:mobile:release` never uses the exception. Passing review CI does not
  sign off external beta/public release. Do not renew/expand the policy silently.

Controls for this approval: use only trusted repository/glob configuration and
signing material; do not accept arbitrary remote patterns/certificates or expose
development tooling to untrusted networks. Recheck upstream remediation before
expiry and remove the exception/backport only after verified replacement. The
owner must explicitly approve any renewal or external-release risk treatment.

Local adoption checkpoint: the installer applied/verified the expected source,
all **158** installer/policy/comparison checks, all **304** mobile tests and all
**537** web tests passed, along with both type checks and repository formatting.
The mobile post-install hook passed locally with nonfunctional CI client values.
The real review audit reports seven moderate,
14 high and zero critical affected-package entries and passes only under the
recorded policy; the raw counts are not zero. The explicit release audit exits 1
as expected and never uses this exception. Clean iOS export passed (3,453 modules,
22 assets, 3,441 source-map entries), with no sources for Forge, braces,
micromatch, UUID or sprintf-js. Bundle SHA-256:
`8a34a1b36c94efe85d8c1262753b1f40bb2b67ab9674cd855d5a6ae5422cbbde`.
This is exported-JavaScript evidence, not native-binary safety.

Hosted adoption checkpoint: commit `1c399be` passed all three jobs in
[CI run 38548461986](https://github.com/Rkigozi/oratio_global/actions/runs/38548461986)
on 2026-10-14. Clean Linux/Node 22 `npm ci` applied and verified the backport in
both app jobs. Mobile passed all 304 tests, all 158 backport/policy checks, its
type check, iOS export and the bounded audit gate. Web passed formatting, both
zero-finding audits, type check, lint, all 537 tests with coverage and production
build. The disposable database suite passed 140 assertions and nine concurrency
cases. This verifies review-branch installation and CI, not a live migration,
signed app or public-release acceptance. PR #5 remains draft; `main` is unchanged.

The previous 833 upstream passes/four pending and helper/interoperability
evidence below support this Node backport. Actual EAS archive/install and signed
artifact checks remain open. NFR-01/SCRUM-47 stay open for full deployed-policy,
moderate/signed-build review and separately approved migration 042 deployment.
No prayer retention/expiry feature is introduced by this mitigation.

## Broader Verification (2026-10-14)

Forge's full Node suite was run in a disposable official `v1.4.0` checkout at
`fa385f92440879601240020f158bed68e444e83a`, whose RSA source matches the published
installed file. Node 24.19.0 and separately installed Mocha 11.7.5 were used;
runner lifecycle scripts were disabled. No Oratio dependency was installed or
patched by this verification.

The tagged suite contains `describe.only` in `tests/unit/jsbn.js`. Its first run
therefore executed only five tests and is **not** counted as full-suite evidence.
Removing only that focus marker in the temporary fixture and enabling
`--forbid-only` produces these results:

| Fixture                                   | Passing | Pending | Failing |
| ----------------------------------------- | ------- | ------- | ------- |
| Unfocused upstream 1.4.0 baseline         | 828     | 4       | 0       |
| Canonical RSA patch + five PR #1159 tests | 833     | 4       | 0       |

Both runs retain the same four upstream deterministic RSA key-generation skips.
No assertion was weakened or removed. The patched JSON report counts 837 tests
across 38 suites; a repeat run also passes. The existing deprecated `Buffer()`
warning remains. Exact upstream test diff, the minimal unfocus patch, source
revisions/hashes and repeatable commands are in
[the verification readme](../../scripts/security-backports/README.md).
The previous 103-case installed-dependency/Expo-helper comparison is separate
evidence, not included in the 833 count.

### Separate Braces Assessment

The installed `braces@3.0.3` compiler was probed with three bounded synthetic
strings under its 10,000-character cap: 4,500 nested parentheses (9,001 chars),
4,900 nested braces with one inner alternative (9,803 chars), and 2,000 nested
valid alternatives (8,001 chars). Child processes had a two-second timeout and
64 MB heap cap. All three returned normally on Node 24.19.0; no compiler
stack-exhaustion failure was reproduced with these inputs on this runtime.
This does not invalidate the advisory or establish safety on other runtimes,
input shapes, expansion paths or the eventual build host.

Passing `maxLength: 512` rejects all three string probes before compilation.
That option is not a verified whole-library remediation: compilation of an
already parsed AST bypasses the string-length check (confirmed with a 513-char
literal), and inspected Metro watcher calls forward only `dot`, not `maxLength`.
No app/shared import of braces/micromatch or prayer-text-to-glob path was found;
the native Jest patterns remain repository-controlled. That narrows the observed
input boundary, not every transitive caller or the audit disposition.

**Disposition:** do not install a speculative braces patch or claim that an
unused length option fixes the application toolchain. No suitable braces
backport is verified by this assessment. The canonical Forge candidate now has
broader Node compatibility evidence, but reproducible local/CI/EAS patch adoption
and signed-artifact checks still require separate review. The installed tree,
blocking audit and owner-risk-acceptance state are unchanged. SCRUM-47 remains
open; this is not beta or merge approval.

## Backport Assessment (2026-10-14)

**Reject the original Forge count-only candidate.** The isolated comparison
reproduces acceptance of a NULL parameters field with 100 content bytes and
non-minimal outer/inner length octets even after applying
[PR #1152](https://github.com/digitalbazaar/forge/pull/1152), immutable revision
`ceba34402e329f0365134f23fe19898756527d65`. It rejects extra SEQUENCE elements
but does not close the additional encoding slack. This supersedes the previous
recommendation to start by assessing that candidate; it must not be adopted as
the complete fix.

[PR #1159](https://github.com/digitalbazaar/forge/pull/1159), immutable revision
`db05494352dd3c9a5a07c5270333dcc78866cad2`, re-encodes and compares the expected
DigestInfo. In disposable copies it rejects all seven malformed fixture classes:
extra inner/outer elements, a non-NULL second element, NULL carrying content,
non-minimal outer/inner lengths, and trailing bytes under default strict parsing.
Both candidates apply cleanly to the hash-pinned installed `node-forge@1.4.0`.

The comparison passes **103 local checks** with Node 24.19.0: valid
SHA-256/384/512 signatures with/without NULL parameters, rejection of incorrect
digests, Node/OpenSSL signature interop, seven malformed classes, and the actual
`@expo/code-signing-certificates@0.0.6` certificate/manifest round trips. Both
synthetic 2048-bit RSA exponents (3 and 65537) are covered. Native OpenSSL verifies
the helper-generated signatures and rejects altered messages.

The malformed fixtures are signed **using the known synthetic private keys**.
They isolate parser acceptance/rejection; this is not a private-key-free forgery
demonstration, evidence of live exploitation, or a whole-cryptography audit.
Full upstream tests, other Forge consumers, native binaries and signed artifacts
have not been verified by this harness. Neither proposal is installed in the
app or its build dependencies; no install hook, override or audit exception is
added. Installed RSA/helper source and lockfile hashes remain unchanged.

Reproduce with `npm run test:security-backports`. CI runs this isolated comparison
before bundling and the unchanged audit. A passing comparison includes explicitly
labelled acceptance cases for the baseline/unsafe candidate; it is not a passing
security gate. Source commits, file hashes, BSD attribution, isolation and fixture
scope are recorded in [the harness readme](../../scripts/security-backports/README.md).

Current GitHub advisory pages still list no patched Forge/braces version, and
both Forge proposals remain open/unreleased. Today's public npm registry recheck
succeeded on retry after an initial sandbox DNS/permission-review timeout:
`node-forge@1.4.0` and `braces@3.0.3` remain the latest published versions.
The fresh mobile production audit exits 1 with seven moderate, 14 high and zero
critical affected-package entries. The two underlying high advisories are
unchanged; an isolated candidate test has not remediated the installed tree.

**Disposition:** canonical encoding is the stronger candidate for a subsequent
backport review, not approved release remediation. Do not apply count-only
verification or assume a Forge patch also resolves `braces`. Before adopting a
backport, verify full upstream/Expo compatibility and a reproducible pinned patch
mechanism across local/CI/EAS installs. npm's version-based audit may still report
a source-patched package; any change in gate treatment needs a separate explicit,
bounded owner decision. No waiver, merge, deployment or native build is authorized
by this assessment. SCRUM-47 and NFR-01 stay open.

## Hosted CI And Upstream Recheck (2026-10-13)

[PR #5](https://github.com/Rkigozi/oratio_global/pull/5), revision `d2343aa`,
passed hosted web and database-security checks and its Netlify deploy preview.
The [mobile job](https://github.com/Rkigozi/oratio_global/actions/runs/38429427132/job/115407388971)
failed at `audit:mobile`: seven moderate and 14 high affected-package entries.
Its later type checks, tests and bundle export were skipped. This is a dependency
gate failure, not a hosted mobile test result.

Fresh registry and advisory checks confirm that `braces@3.0.3` and
`node-forge@1.4.0` are still the latest published releases, and both high-severity
advisories list **no patched version**. `micromatch@4.0.8` still requires braces.
The newer compatible `expo@57.0.28` / `@expo/cli@57.0.29` patch still requires
node-forge and Metro tooling. Updating that patch alone cannot clear the gate.
The suggested forced Expo downgrade is not a compatible fix for this app.

The 14 high entries propagate from the two underlying high-severity advisories,
not 14 independently identified application defects. The input-boundary and
export evidence below narrows exposure to development/build tooling; it does
not eliminate that risk or sign off a native binary.

CI now runs the mobile type checks, tests and iOS export before the existing
audit command. The audit uses `!cancelled()` so it also runs after an earlier
functional failure. A high-severity finding still fails the same `mobile` job;
there is no `continue-on-error`, threshold change, ignore list or waiver.
This preserves the security gate while making functional CI evidence visible.
The [follow-up run](https://github.com/Rkigozi/oratio_global/actions/runs/38466108407)
at `bd7d9e4` passed mobile type checks, all 304 tests and the 3,453-module iOS
export, plus web/database-security and the Netlify preview. Only the mobile
dependency audit failed. This does not clear the security gate.

To clear the dependency gate, obtain a compatible upstream release or a reviewed
remediation/replacement for the affected tooling and rerun the audit plus mobile
compatibility checks. Any proposed temporary residual-risk decision must be
bounded, recorded and explicitly approved by the release owner; none is applied
by this workflow change. External beta and merge readiness remain unsigned.

## Findings And Fixes

These findings were established from the checked-in migrations and disposable
PostgreSQL tests, not a fresh inventory of the live Supabase project.

| Finding                                                                                                                                                                           | Local remediation                                                                                                                                                                                                                     | Deployment state                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Any authenticated account could read all waitlist email addresses under migration 005's SELECT policy.                                                                            | Migration 042 removes the read policy and client read/update/delete privileges. Anonymous and authenticated clients retain only email/source INSERT access; trusted backend access remains.                                           | Tested locally; not applied live.                  |
| `rate_limits` lacked RLS, and `check_rate_limit` trusted arbitrary user IDs, action names, limits and windows. Direct access or RPC calls could inspect/manipulate quota records. | Migration 042 enables RLS, removes client table privileges, authenticates the caller and accepts only the existing 10-prayer/30-comment hourly limits. Same-user/action calls serialize; rolled-back writes release their quota slot. | Tested locally; not applied live.                  |
| Dependency audit found a high-severity brace-expansion report and the vulnerable navigation URL decoder.                                                                          | Compatible lockfile updates: React Navigation core 7.21.13 -> 7.23.0 removes query-string/decode-uri-component. Brace-expansion branches move to 1.1.21, 2.1.7 and 5.0.12. No forced overrides or Expo downgrade.                     | Included in the local checkpoint; not distributed. |

The security test initially failed on the missing-RLS assertion against migrations
001-041, then passed with 042. Existing migrations were not edited.
Waitlist registration remains supported; clients must not request inserted rows
back. The existing shared query uses `.insert({ email, source })` without `.select()`.
No moderator role, account data or prayer visibility was changed in the live project.

Dependency sources: the [URL-decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)
describes malformed-input denial of service; the brace-expansion advisories cover
[nested recursion](https://github.com/advisories/GHSA-qhr7-859c-m2p7),
[comma parsing](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) and
[quadratic rewriting](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr).
This establishes vulnerable dependencies, not evidence that Oratio was exploited.

## Current Tooling Follow-Up (2026-10-07)

This follow-up supersedes the initial October audit below. It is based on local
checkpoint `7a1fe42` plus the dependency and CI changes, with Node 24.19.0.

| Audit scope                                        | Current result                   |
| -------------------------------------------------- | -------------------------------- |
| Web, including development dependencies            | Zero reported vulnerabilities    |
| Mobile production dependencies                     | 7 moderate, 14 high, 0 critical  |
| All workspaces, including development dependencies | 12 moderate, 45 high, 0 critical |

The full-tree count fell from 62 to 57 affected-package entries. **All critical
entries are removed**, not waived. The remaining entries derive from four
underlying advisories; parent-package propagation inflates the npm totals.
The mobile high/critical CI gate still fails. No gate was relaxed or bypassed.

### Applied Updates

- `vitest` and `@vitest/coverage-v8`: 3.2.7 -> 4.1.11. This also installs
  `@vitest/mocker@4.1.11` and removes `tinypool` entirely. Vite remains 6.4.3;
  Expo remains 57.0.27. No forced dependency override was needed.
- `sharp`: 0.35.4 -> 0.35.5, including its patched binary dependencies.
- `fast-uri`: 3.1.7 -> 3.1.8 through its existing compatible transitive range.
- Declare `@types/node@22.20.5` directly for the web workspace and include
  Node types explicitly. Vitest 4 no longer supplies these implicitly; the
  existing Netlify function/server code needs them. CI and Netlify use Node 22.
- Add `audit:web:tooling` with development dependencies included at the existing
  high/critical threshold. Web CI also runs coverage, not only the test suite,
  so the migrated coverage provider and uploaded report are exercised.

Sources: [Vitest 4 migration](https://v4.vitest.dev/guide/migration),
[Vitest mocker fix](https://github.com/advisories/GHSA-82fw-gwwq-j7x9),
[Tinypool advisory](https://github.com/advisories/GHSA-85c8-ppgw-ccpr),
[sharp fix](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) and
[fast-uri fix](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj).

### Remaining Exposure

This is a scoped source/dependency review, not a penetration test or a signed
binary attestation. No exploit was run against a live service.

| Advisory                     | Observed local path and input boundary                                                                                                                                                                                                                                                                                                                                            | Disposition                                                                                                                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `braces@3.0.3`, high         | `micromatch@4.0.8` in Metro file watching and Jest discovery/configuration. Inspected `metro-file-map/src/watchers/common.js` and `jest-haste-map/build/watchers/common.js` match paths against configured glob patterns. No application import or prayer-text-to-pattern path was found.                                                                                         | Upstream lists no patched release. Keep repository/configuration inputs trusted and dev servers off untrusted networks. Tooling DoS risk remains; this is not an exception to the audit gate.                                                        |
| `node-forge@1.4.0`, high     | Expo CLI certificate utilities call the affected verification API: `@expo/code-signing-certificates/build/main.js` validates self-signed certificates and verifies locally generated manifest signatures. `@expo/cli/build/src/utils/codesigning.js` loads configured certificate/key files and signs development manifests. The app has no custom updates signing configuration. | Upstream lists no patched release. Treat certificate/key material and local signing configuration as trusted inputs; do not import unknown certificates or disable verification. Build/development exposure remains and needs security-owner review. |
| `uuid@7.0.3`, moderate       | `@expo/config-plugins -> xcode@3.0.1`; `xcode/lib/pbxProject.js:generateUuid` calls `uuid.v4()` without a caller-supplied buffer. The advisory concerns supplied buffers in v3/v5/v6.                                                                                                                                                                                             | The inspected call does not meet the advisory's precondition. Latest `xcode@3.0.1` still requires UUID 7; do not force a major override without compatibility evidence. Keep tracked pending upstream remediation or an explicit bounded decision.   |
| `sprintf-js@1.0.3`, moderate | Mobile Jest/Babel coverage tooling: `@istanbuljs/load-nyc-config -> js-yaml@3.15.2 -> argparse@1.0.10`. Argparse's formatter interpolates help/usage templates; the inspected NYC loader uses YAML parsing, not the YAML CLI. No application import or user-prayer format-string path was found.                                                                                  | Latest upstream 1.1.3 is also affected, with no patched release. Do not process untrusted tooling/configuration templates. Retain until compatible upstream remediation or an explicit bounded decision.                                             |

Remaining sources: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
[node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv),
[UUID](https://github.com/advisories/GHSA-w5hq-g745-h8pq) and
[sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). Registry checks
confirmed the latest braces, node-forge, sprintf-js and xcode releases above.

A clean production-mode iOS export with source maps contains 3,040 source entries.
None belongs to `braces`, `micromatch`, `node-forge`, `sprintf-js`, `uuid` or
`tinypool`. The export contains only the nonfunctional CI Supabase configuration,
not the temporary notice-QA endpoint. Bundle:
`index-114dda20d7806b0a89d06470ae4d8c9e.hbc`, SHA-256
`89337c8c5166812a08662fc95545c55477c01facde103b08c70227b87e72a551`.
This supports an inference of no bundled JavaScript exposure for these packages
in this export. It does not inspect native code, prove build-host safety, or
substitute for checking the eventual signed release artifact.

Reproduce from the repo root with supported Node and nonfunctional public values:

```bash
EXPO_NO_DOTENV=1 \
EXPO_PUBLIC_SUPABASE_URL=https://ci-preflight.supabase.co \
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ci_build_check_only \
EXPO_PUBLIC_SERVICE_NOTICE_URL= CI=1 \
npm run export:ios --workspace @oratio/mobile -- --source-maps
```

Inspect the JSON `sources` array in `apps/mobile/dist/ios/_expo/static/js/ios/*.hbc.map`
for exact `node_modules/<package>/` path segments. Keep source maps local; they
were not uploaded or added to Git.

All 534 web tests passed on Vitest 4 without changing or dropping assertions;
all 255 mobile tests passed. V8 coverage now uses the upstream AST-based remapper:
57.71% statements, 53.94% branches, 48.43% functions and 60.05% lines. The existing
include/exclude scope was retained; the older percentages are not directly
comparable and no coverage target was lowered. Both type checks, web lint and build
passed after declaring Node types; the type errors and 25 derived lint warnings
seen on the first migration run are resolved. Browser regressions passed 38 tests
with six authenticated tests deliberately skipped. A local sharp SVG-to-PNG smoke
check passed and reported librsvg 2.63.2. No new device, database or hosted CI run
was performed in this tooling follow-up. See [release readiness](../V1_RELEASE_READINESS.md).

**Decision: SCRUM-47 stays open.** No release-owner risk acceptance is implied.
Before external beta, seek compatible upstream fixes or an explicitly approved,
time-limited mitigation with owner, expiry, recheck evidence and signed-artifact
scope. Do not silence or remove the mobile audit gate to make CI green. Migration
042 still needs separately approved live deployment; this follow-up did not touch it.

## Initial Dependency Checkpoint (2026-10-07)

The refreshed audit supersedes the September snapshot below. These are npm
affected-package entries, including propagated parent findings, not independent
vulnerabilities or proof of exploitation.

| Scope                                   | Before today's patches                 | After today's patches           |
| --------------------------------------- | -------------------------------------- | ------------------------------- |
| All workspaces, production dependencies | 1 low, 7 moderate, 16 high, 1 critical | 7 moderate, 14 high, 0 critical |
| Web production dependencies             | 1 low, 1 high                          | Zero reported vulnerabilities   |
| Mobile production dependencies          | 7 moderate, 16 high, 1 critical        | 7 moderate, 14 high, 0 critical |

Compatible lockfile updates installed `shell-quote@1.12.0`,
`source-map-js@1.2.2` and `dompurify@3.4.16`. Expo is now `57.0.27`, with
its compatible dependency patches, and Expo Doctor passes 21/21 checks.
No major overrides, forced audit fix or Expo/React Native downgrade was used.
Sources: [shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv),
[source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q),
[DOMPurify hook handling](https://github.com/advisories/GHSA-p98j-92pf-mc4p)
and [DOMPurify rawtext handling](https://github.com/advisories/GHSA-6688-9rhm-gjv2).

Remaining production findings come from `braces@3.0.3`, `node-forge@1.4.0`
and the existing `xcode -> uuid@7.0.3` chain. The reviewed
[braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and
[node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
list no patched version as of this check. They are present through Expo/Metro
tooling; this is dependency-path evidence, not a complete reachability assessment.
**The mobile high/critical CI audit gate still fails.** Do not disable the gate
or infer release approval from green functional tests.

The initial audit **including development dependencies** reported 14 moderate,
46 high and 2 critical affected-package entries. The critical entries are
`tinypool` and its `vitest` parent, with
[worker-option prototype-pollution advisories](https://github.com/advisories/GHSA-85c8-ppgw-ccpr).
Other direct findings include `@vitest/mocker`, `fast-uri`, `sharp` and
`sprintf-js`, as well as the production findings above. This broader tooling
upgrade/exposure review remains open; production-only counts do not clear it.
Do not expose test tooling to untrusted networks or run untrusted code/fixtures.
The checkpoint does not grant any risk waiver.

Verification after the patches: 534 web tests and 255 mobile tests passed;
both type checks, web lint/build, Expo Doctor and iOS JS/Hermes export passed.
The disposable database suite also passed today: 140 assertions and nine races.
Local browser regression results and checkpoint scope are recorded in
[release readiness](../V1_RELEASE_READINESS.md). No live migration or production
deployment was performed. Local commits preserve the work, not a release-ready build.

## Historical Dependency Decision (2026-09-30)

September production audit before fixes: **13 moderate, 1 high, 0 critical**.
After fixes: **10 moderate, 0 high, 0 critical**. These are npm affected-package
counts, not counts of independent vulnerabilities. The remaining production
reports propagate through Expo's `xcode@3.0.1 -> uuid@7.0.3` build-tool chain.

The [UUID advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) concerns
caller-supplied buffers in v3/v5/v6. The installed Xcode helper's observed call
uses `uuid.v4()` without a supplied buffer. This narrows the observed exposure;
it does **not** turn a nonzero audit into a clean security sign-off. Upstream
remediation or an explicit owner-approved, time-limited exposure decision remains
required before external beta. Do not use `npm audit fix --force` to downgrade
Expo to the incompatible version proposed by npm.

The npm registry still reports `xcode@3.0.1` as the latest release on this review
date, requiring `uuid@^7.0.3`. This JavaScript build helper is separate from the
installed Apple Xcode application; updating Apple Xcode would not fix this dependency.

`audit:mobile` now runs in CI, matching the existing web high/critical gate.
Moderate findings remain visible and tracked; passing that CI threshold does not
waive the stricter release review.

## Historical Verification (2026-09-30)

Evidence date: 2026-09-30, local working tree based on `6b5a710`, with uncommitted
build/NFR work retained. Node 24.19.0; disposable PostgreSQL 14 with the repository's
minimal Supabase auth/storage bootstrap. No production connection string is read
by the database test runner.

| Check                                                    | Result                                                                                                                                                                     |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All migrations through 042; security regression suite    | 37 assertions passed, including all public tables having RLS, client email/quota access denial, identity/parameter spoofing, quota expiry and real prayer/comment inserts. |
| Existing moderation and blocking SQL suites              | 45 + 58 assertions passed.                                                                                                                                                 |
| Real two-session database races                          | Seven existing blocking cases plus quota last-slot contention and rollback recovery passed.                                                                                |
| Mobile suite                                             | 231 tests passed, including seven navigation parser compatibility/malformed-query cases.                                                                                   |
| Web suite                                                | 485 tests passed; existing prayer-detail render warning remains.                                                                                                           |
| Mobile/web type checks and web lint                      | Passed.                                                                                                                                                                    |
| Web production build and audit                           | Build passed with the existing large-chunk warning; web production audit reports zero vulnerabilities.                                                                     |
| iOS JS/Hermes export with nonfunctional public CI values | Passed: 3,047 modules, 22 assets. Not a signed binary or device test.                                                                                                      |
| Apple tooling                                            | Xcode 26.6 (17F113) verified using scoped `DEVELOPER_DIR`; no signing changes or native build started.                                                                     |

Re-run with supported Node on `PATH`:

```bash
npm run test:db
npm run test:mobile
npm test
npm run type-check:mobile
npm run type-check
npm run lint
npm audit --omit=dev --audit-level=moderate
```

`test:db` needs `initdb`, `pg_ctl` and `psql` on `PATH`. On this Mac the tools
are in `/opt/homebrew/opt/postgresql@14/bin`. The runner creates and removes its
own Unix-socket cluster. CI now installs PostgreSQL and runs the same suites;
that new hosted CI job has not run yet. See the October checkpoint for current audit results.

## Remaining Release Gates

- Approve and apply migration 042 to the verified backend, then confirm deployed
  policies/grants and migration history. No live deployment was performed here.
- Recheck the actual PostgREST waitlist signup and prayer/comment submission paths,
  including denial/retry messages and expected rate-limit behaviour after deployment.
- Finish the whole deployed table/RPC/storage/role review. Having RLS enabled does
  not prove every policy is correct; the new catalogue assertion is only a guardrail.
- Complete the wider sensitive-logging, edge-function and shipped-client credential
  checks, remaining cross-account/blocking QA and signed-build verification.
- Resolve the current production and development-tool advisories, with reviewed
  reachability evidence and an explicit, time-limited decision for any residual
  exposure. No automatic release waiver or audit-gate bypass has been granted.

The full NFR-01 gate and SCRUM-47 remain open. The local checkpoint is not a push,
live migration, TestFlight distribution or update to the external QA spreadsheet.
