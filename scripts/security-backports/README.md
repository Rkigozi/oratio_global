# Isolated Forge Backport Assessment

Run from the repository root with supported Node (22 or 24) and Git:

```bash
npm run test:security-backports
```

This is a comparison harness, **not an install hook or security audit waiver**.
Passing means the expected baseline and candidate behavior was reproduced,
including explicitly labelled `ACCEPTS` results for the unsafe candidates.
Only the canonical candidate is expected to reject every malformed fixture.

The harness copies the installed Forge library and Expo certificate helper to
disposable directories, applies each proposal there with `git apply`, and loads
each separate copy. Installed dependency files and the lockfile are hash-checked
before and after. Temporary copies are removed; no network, credentials,
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

Forge is `1.4.0`, RSA source SHA-256:
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
Its RSA source matches the installed file hash above. Mocha `11.7.5` is installed
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
fixtures still verify. The canonical candidate passes this scoped comparison,
but neither proposal is installed in Oratio. Adoption requires a separately
reviewed reproducible patch mechanism, full upstream/Expo regression evidence,
fresh audit and signed-artifact checks. The `braces` finding is separate.
`audit:mobile` remains unchanged and blocking. See
[the security review](../../docs/backlog/SECURITY-REVIEW.md).
