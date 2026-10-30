# Verified Node Backport And Audit Policy

## Current Dependency Checkpoint (2026-10-29)

The lockfile now installs published `node-forge@1.4.2`. Its reviewed Node RSA
source includes canonical DigestInfo verification and has SHA-256
`6632e195295ce76f6bb9131ee770dcd6cc1ee4ffac7906302208b00faf95a87f`.
The root hook verifies this source without rewriting it. It retains support for
the previously approved, exact 1.4.0 backport; unknown versions or source changes
still fail without overwriting local files. The npm package's SHA-512 integrity
is recorded in the root lockfile.

The offline harness tests installed 1.4.2 directly with Expo's certificate helper
0.0.7 (`build/main.js` SHA-256
`677bb9dab63300b52ead2263e54f1ffbbd292faaa1d7f166d0535a49eec54a74`).
It reconstructs historical **RSA-only** controls using the hash-pinned
`forge-140-to-142-rsa.patch` in temporary directories. Supporting library files
remain from 1.4.2, so these controls are not full 1.4.0 distribution tests.
The reconstruction diff has SHA-256
`ca88156f6407c4c8ab9eb514cc4cc42f09711f864738b5d6dfeda257a5db9dd5`;
the original baseline and proposal hashes below remain unchanged.

The original backport approval below is historical. The current Zod treatment
is a separate, explicitly approved development-only exception. See the dated
[security review](../../docs/backlog/SECURITY-REVIEW.md#dependency-remediation-2026-10-29)
for current findings and verification. No new risk acceptance is implied by
installing an upstream patch.

## Current Development Audit Approval (2026-10-30)

The release owner approved only `GHSA-mrhx-c7xc-m3w5` for the reviewed Expo CLI
dependency: Zod 3.25.76 at `node_modules/@expo/cli/node_modules/zod`, CLI 58.1.17
at `node_modules/@expo/cli` and Expo 58.0.21 at `node_modules/expo`. The schema-2
policy pins those entries and the window from `2026-10-30T00:00:00Z` until
`2026-11-13T00:00:00Z` (exclusive). No deadline extension is granted.

The development audit reports raw findings and applies only this exception.
Changed packages/paths/versions, new high/critical advisories, inactive dates,
missing verified source and incomplete audits fail. The policy evaluator also
rejects expanding the configured package table or moving its approved dates.
Release mode never accepts this exception; it does not approve beta/distribution
or repair Zod 3. Use trusted local development plugins/configuration and keep
development tooling off untrusted networks.

The superseded Forge/braces JSON is preserved in
[approval history](./approval-history/2026-10-14.json) and cannot activate under
the current evaluator. All 172 security checks pass. The actual development
audit passes with three high and five low affected-package entries still
reported; the release audit rejects those same high findings.

```bash
npm run install:security-backport
npm run verify:security-backport
npm run audit:mobile          # owner-approved development/code-review policy
npm run audit:mobile:raw      # unchanged npm findings, without policy treatment
npm run audit:mobile:release  # strict gate; never uses the temporary exception
```

## Development Backport Approval (2026-10-14)

The release owner explicitly approved the bounded development-review approach
on 2026-10-14. That checkpoint applied Forge's canonical RSA patch through the
root npm `postinstall` hook, with a hash/version-checked, idempotent installer.
The mobile EAS post-install hook verifies the reviewed source before the existing build-environment check.
No cloud/native build or public release is implied by these hooks.

The recorded approval lasts from `2026-10-14T00:00:00Z` until
`2026-11-13T00:00:00Z` (exclusive): at most 30 days. It covers only the two
recorded advisories, exact then-approved package versions/install paths and their
reviewed parent entries. All findings remain visible. Every critical, new high
advisory, new parent/path/version, unknown source, failed audit or expired approval
fails closed. The exception does not waive moderate findings or authorize
external beta/public distribution. See `approval-history/2026-10-14.json` and
[the approval record](../../docs/backlog/SECURITY-REVIEW.md).

The approved 1.4.0 Node RSA source after backport installation has SHA-256
`c7b72e7ef41f4fc0e5228dce3e37851e9ca064c789365d5e392c25d1c5f6e710`.
The installer checks every present lockfile-listed copy, preserves unknown/local
source changes, and verifies repeat installs. Forge's version metadata and
browser `dist` bundles are **not** rewritten or claimed fixed. These checks cover
the inspected Node build-tool usage, not arbitrary browser consumers.

## Regression Comparison

Run from the repository root with supported Node (22 or 24) and Git:

```bash
npm run test:security-backports
```

This comparison harness is separate from the installer and policy gate.
Passing means the expected baseline and candidate behavior was reproduced,
including explicitly labelled `ACCEPTS` results for the unsafe candidates.
The canonical candidate and the actually installed upstream version must both reject
every malformed fixture. Installer/policy tests additionally exercise tampering,
expiry, release mode, dependency changes and failure handling.

The harness copies the installed Forge library and Expo certificate helper to
disposable directories, applies each proposal there with `git apply`, and loads
each separate copy. Installed dependency files and the lockfile are hash-checked
before and after the comparison. Unpatched/count-only controls are reconstructed
only in disposable copies; the installed upstream version is also tested directly.
Temporary copies are removed; no network, credentials,
environment files, real certificates, app builds or telemetry are used.

Fixtures use freshly generated synthetic 2048-bit RSA keys with e=3 and e=65537.
Malformed signatures are created **with the synthetic private key** to isolate
verification/parser behavior. They do not demonstrate private-key-free forgery
or exploitation of Oratio. Native Node/OpenSSL signatures, SHA-256/384/512,
valid encodings with/without NULL parameters and Expo's certificate/manifest
helper round trips exercise the comparison's positive cases.

## Pinned Proposal Sources

The `.patch` files retain the exact `lib/rsa.js` diff returned by GitHub for
these immutable commits, with standard file headers added:

- [PR #1152](https://github.com/digitalbazaar/forge/pull/1152),
  commit `ceba34402e329f0365134f23fe19898756527d65`: count-only proposal.
  Patch SHA-256: `50d8e3f38443736858c2c81dc2b569c18083e687f81acc5f9c17a568a7e4f6f6`.
- [PR #1159](https://github.com/digitalbazaar/forge/pull/1159),
  commit `db05494352dd3c9a5a07c5270333dcc78866cad2`: canonical-encoding proposal.
  Patch SHA-256: `be8e74c1d011bab844d9e2705f7a5f6428f444b28fa174cdad1572a45ef8f618`.

The original 2026-10-14 assessment used Forge `1.4.0`, with published RSA source SHA-256:
`fd4740238145ec26470eb3f06a627c72039538ce1307dbdce40521f94dfd0a50`.
That assessment used Expo helper `0.0.6`, with main source SHA-256:
`3670cfbd69934b475257649886517d0314890ca4139708d2c812efaab04bc6d1`.
Unexpected version/source changes fail the assessment rather than silently
reapplying an outdated patch. Review the evidence before updating those pins.
Forge's BSD-3-Clause attribution is retained in `FORGE-LICENSE.txt`.
Unified-diff blank context lines retain their required space marker; these are
patch data, not trailing whitespace in the resulting JavaScript source.

## Full Upstream Node Suite

The broader verification uses a separately downloaded test fixture. It is not
part of the offline comparison command or an Oratio dependency installation.
Forge tag `v1.4.0` resolves to `fa385f92440879601240020f158bed68e444e83a`.
Its original RSA source matches the published file hash above. Mocha `11.7.5` is installed
only in the fixture runner, with lifecycle scripts disabled.

The tag contains `describe.only` in `tests/unit/jsbn.js`. Without removing that
focus marker, Mocha reports only five passing tests. The unfocus fixture changes
only that registration, not assertions or library behavior. Both full runs use
`--forbid-only`. Baseline: **828 passing, four pending**. Canonical RSA patch plus
the proposal's five new upstream tests: **833 passing, the same four pending**.
The pending tests are deterministic RSA key-generation comparisons skipped by
upstream under this Node configuration. The existing `Buffer()` warning remains.

Additional fixture provenance:

- `forge-1159-tests.patch`: exact `tests/unit/rsa.js` diff from the same pinned
  `db05494352dd3c9a5a07c5270333dcc78866cad2` proposal.
  SHA-256: `8d7dd7a86ff1794b62a420e476488a4c47e577f48f7fa0627223b550f847f8ba`.
- `forge-v1.4.0-unfocus.patch`: local test-registration correction only.
  SHA-256: `07dda793a78802b76acb4acc2785ee5a793e655c180c14fd6307b2d8f7041f53`.

From the Oratio repository root, repeat in a fresh disposable fixture:

```bash
(
  set -eu
  ORATIO="$PWD"
  FIXTURE="$(mktemp -d /private/tmp/oratio-forge-full-XXXXXX)"
  git clone --depth 1 --branch v1.4.0 https://github.com/digitalbazaar/forge.git "$FIXTURE/upstream"
  test "$(git -C "$FIXTURE/upstream" rev-parse HEAD)" = fa385f92440879601240020f158bed68e444e83a
  npm install --prefix "$FIXTURE/runner" --ignore-scripts --no-audit --no-fund --save-exact mocha@11.7.5
  cd "$FIXTURE/upstream"
  git apply --check --whitespace=error "$ORATIO/scripts/security-backports/forge-v1.4.0-unfocus.patch"
  git apply --whitespace=error "$ORATIO/scripts/security-backports/forge-v1.4.0-unfocus.patch"
  NODE_ENV=test node "$FIXTURE/runner/node_modules/mocha/bin/mocha.js" --no-config --no-package --forbid-only --timeout 30000 --reporter dot tests/unit/index.js
  git apply --check --whitespace=error "$ORATIO/scripts/security-backports/forge-1159-rsa.patch" "$ORATIO/scripts/security-backports/forge-1159-tests.patch"
  git apply --whitespace=error "$ORATIO/scripts/security-backports/forge-1159-rsa.patch" "$ORATIO/scripts/security-backports/forge-1159-tests.patch"
  NODE_ENV=test node "$FIXTURE/runner/node_modules/mocha/bin/mocha.js" --no-config --no-package --forbid-only --timeout 30000 --reporter dot tests/unit/index.js
)
```

Results above are local Node 24.19.0 evidence, not browser, native-binary or
EAS-install verification. A test runner's temporary dependency tree is not
added to Oratio's lockfile. Keep the candidate's adoption decision separate.

## Adoption Boundary

The count-only candidate remains rejected: NULL-with-content and non-minimal
length fixtures still verify. The current installation uses published 1.4.2;
the canonical 1.4.0 backport remains a historical control and supported fallback.
Actual EAS archive/install, browser/native-binary and signed-artifact acceptance
remain separate. The historical `braces` approval covers only its recorded
versions and window; it cannot cover the new Zod finding. Public-release review stays strict. See
[the security review](../../docs/backlog/SECURITY-REVIEW.md).
