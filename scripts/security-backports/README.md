# Verified Node Backport And Audit Policy

The release owner explicitly approved the bounded development-review approach
on 2026-10-14. Forge's canonical RSA patch is now applied by the root npm
`postinstall` hook, with a hash/version-checked, idempotent installer. The mobile
EAS post-install hook verifies it before the existing build-environment check.
No cloud/native build or public release is implied by these hooks.

```bash
npm run install:security-backport
npm run verify:security-backport
npm run audit:mobile          # owner-approved development/code-review policy
npm run audit:mobile:raw      # unchanged npm findings, without policy treatment
npm run audit:mobile:release  # strict gate; never uses the temporary exception
```

The recorded approval lasts from `2026-10-14T00:00:00Z` until
`2026-11-13T00:00:00Z` (exclusive): at most 30 days. It covers only the two
recorded advisories, exact current package versions/install paths and their
reviewed parent entries. All findings remain visible. Every critical, new high
advisory, new parent/path/version, unknown source, failed audit or expired approval
fails closed. The exception does not waive moderate findings or authorize
external beta/public distribution. See `mobile-audit-exceptions.json` and
[the approval record](../../docs/backlog/SECURITY-REVIEW.md).

The Node RSA source after installation must have SHA-256
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
The canonical candidate and the actually installed backport must both reject
every malformed fixture. Installer/policy tests additionally exercise tampering,
expiry, release mode, dependency changes and failure handling.

The harness copies the installed Forge library and Expo certificate helper to
disposable directories, applies each proposal there with `git apply`, and loads
each separate copy. Installed dependency files and the lockfile are hash-checked
before and after the comparison. Unpatched/count-only controls are reconstructed
only in disposable copies; the installed backport is also tested directly.
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

Forge is `1.4.0`, original published RSA source SHA-256:
`fd4740238145ec26470eb3f06a627c72039538ce1307dbdce40521f94dfd0a50`.
Expo helper is `0.0.6`, main source SHA-256:
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

The count-only candidate is rejected: NULL-with-content and non-minimal length
fixtures still verify. Only the canonical Node backport is installed. Full
upstream Node evidence and the installed comparison support it; actual EAS
archive/install, browser/native-binary and signed-artifact acceptance remain
separate. The `braces` finding is risk-accepted for development review during the
recorded window, not patched. Public-release review stays strict. See
[the security review](../../docs/backlog/SECURITY-REVIEW.md).
