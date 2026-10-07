# iOS Launch Security Review

Last updated: 2026-10-07. Jira: [SCRUM-47](https://oratio.atlassian.net/browse/SCRUM-47).
Status: **In Progress**, not security sign-off. Supports NFR-01 in
[the NFR checklist](../NFR-CHECKLIST.md).

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

## Current Dependency Checkpoint (2026-10-07)

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

The separate audit **including development dependencies** reports 14 moderate,
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
