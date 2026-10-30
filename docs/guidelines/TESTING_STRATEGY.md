# Oratio Testing Strategy

Last reviewed: 2026-10-21. Scope: the iOS product, shared backend and supporting
web destinations. This describes the existing test tooling, not a proposed stack.
Repository conventions are in [AGENTS.md](../../AGENTS.md); evidence terminology
follows the [documentation standard](./DOCUMENTATION.md).

## Choose Checks By Changed Behaviour

| Change                          | Primary checks                                                        | Additional checks                                                                     |
| ------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Mobile screen/hook/service      | Jest Expo tests and mobile type-check                                 | Physical iPhone in Expo Go; both themes/keyboard/accessibility as relevant            |
| Shared query/validation/mapping | Vitest shared-logic tests currently under `apps/web/src/app/services` | Both app type checks and affected native tests; compatibility of deployed web readers |
| Migration/RLS/RPC               | Disposable PostgreSQL suite and focused rollout/race assertions       | Explicitly approved live rollout, effective grants and preservation postchecks        |
| Website/admin/recovery/links    | Web unit/component tests, type-check, lint and build                  | Relevant Playwright/browser journeys and auth/role cases                              |
| Release configuration           | Config/security tests and clean iOS bundle export                     | Signed binary/install/upgrade/device checks later; export is not distribution         |
| Documentation only              | Formatting, relative links/anchors and source/command accuracy        | Check no requirements, test evidence or release gates were silently changed           |

The directory containing a shared test does not make the behaviour web-only.
Keeping those tests green is compatibility work, not a commitment to a second
web product or authorisation to publish the website.

## Commands

From the repository root, using the Node version in `.nvmrc`:

```bash
# Native
npm run type-check:mobile
npm run test:mobile

# Shared logic and supporting web
npm run type-check
npm test
npm run test:coverage
npm run lint
npm run build

# Isolated database assertions and concurrent-session tests
npm run test:db

# Formatting
npm run format:check
```

The database runner needs local PostgreSQL binaries (`initdb`, `pg_ctl`, `psql`,
`createdb`) on PATH. It creates and removes a disposable cluster; it does not
apply migrations to Supabase. Live data changes always require separate target,
scope and approval checks. Never weaken RLS or reuse real private content as fixtures.

Web E2E uses the existing Playwright configuration:

```bash
npm run test:e2e
```

Remote checks use `npm run test:e2e:remote` only when a live-site test is intended.
Authenticated cases require controlled QA account credentials in the environment;
skipped authenticated cases are not passes. Never put passwords in the docs,
command history or test output. Browser checks are not native-device evidence.

## Native Acceptance Stages

**Development acceptance:** complete features and functional QA in Expo Go. Use
[QA-CHECKLIST.md](../QA-CHECKLIST.md) for three-account audience/relationship checks,
failure/retry, keyboard, light/dark, permissions and navigation. Preserve dated
reported manual results and rerun changed or release-critical journeys.

**Signed-build acceptance:** after distribution entry criteria are met, repeat the
critical set in TestFlight and prove signed-build-only requirements. Performance,
native crashes, installation/upgrade and release configuration cannot be signed
off from Expo Go or a JavaScript export.

The [NFR register](../NFR-CHECKLIST.md) alone owns numerical budgets and quality
acceptance. Test counts, coverage percentages and a green CI run are supporting
evidence, not whole-NFR sign-off. Do not invent a replacement coverage target here.

## Record Evidence Once

Colocate tests with the changed behaviour. Test success, validation, denied
access, loading/empty/failure, retry, repeated taps and superseded async results
where relevant. Shared/backend changes need role/audience/expiry/blocking cases.

Put detailed dated results in the owning [feature runbook](../backlog/README.md),
link them from the relevant checklist/story, and distinguish local tests, hosted
CI, approved database rollout, website deploy and physical-device acceptance.
For device/release evidence record candidate SHA (and local changes, if any),
backend revision, device/iOS, conditions, expected/actual result and defect key.
