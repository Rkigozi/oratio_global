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

## Adoption Boundary

The count-only candidate is rejected: NULL-with-content and non-minimal length
fixtures still verify. The canonical candidate passes this scoped comparison,
but neither proposal is installed in Oratio. Adoption requires a separately
reviewed reproducible patch mechanism, full upstream/Expo regression evidence,
fresh audit and signed-artifact checks. The `braces` finding is separate.
`audit:mobile` remains unchanged and blocking. See
[the security review](../../docs/backlog/SECURITY-REVIEW.md).
