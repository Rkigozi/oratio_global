# Oratio

Oratio connects people through shared Christian prayer. The **iOS app is the
product**, built with Expo and React Native. The website supports the product
with public information, legal/support pages, account recovery, shared links
and protected administration.

## Current Priority

The V1 delivery sequence is **mobile implementation and Expo Go acceptance**,
followed by TestFlight validation and public App Store release. TestFlight entry
requires a feature-complete candidate, active Apple Developer Program membership
and release approval. Membership and signed distribution remain pending.
Android distribution is outside the initial iOS release scope.

Website conversion is a separate release workstream. The current web deployment
still contains authenticated product screens; the simplified public website is
planned. The iOS app remains the sole product implementation target.

## Start Development

Use the Node version in `.nvmrc`. From the repository root:

```bash
npm install
npm run dev:mobile
```

Open the project in Expo Go using the QR code. See
[Quick Start](./docs/QUICK-START.md) for environment setup and troubleshooting.

## Repository

| Location          | Responsibility                                                            |
| ----------------- | ------------------------------------------------------------------------- |
| `apps/mobile`     | iOS product UI, navigation, permissions and device integration            |
| `apps/web`        | Website, protected operational tools and web handoffs; conversion pending |
| `packages/shared` | Platform-neutral queries, types and validation                            |
| `supabase`        | Shared schema, RLS, RPCs, migrations and Edge Functions                   |
| `docs`            | Current design, delivery plan, QA and operating records                   |

New shared logic belongs in `packages/shared`; UI stays in its app. Never edit
an applied migration. A Git push, database migration, Netlify deploy and signed
iOS release are four distinct actions.

## Documentation

Start at the [documentation index](./docs/README.md). It separates current mobile
work, future distribution and website responsibilities without duplicating status.

- [Release plan](./docs/V1_RELEASE_READINESS.md): delivery stages and acceptance gates.
- [Requirements and design](./docs/design/README.md): requirements, HLD, LLDs and traceability.
- [Functional QA](./docs/QA-CHECKLIST.md) and [NFRs](./docs/NFR-CHECKLIST.md): acceptance evidence.
- [Testing strategy](./docs/guidelines/TESTING_STRATEGY.md): actual suites and commands.
- [Documentation standard](./docs/guidelines/DOCUMENTATION.md): contributor-facing writing and evidence conventions.
- [Backlog agreement](./docs/backlog/README.md): story ownership and feature runbooks.
- [AGENTS.md](./AGENTS.md): repository instructions for coding agents.

## License

All rights reserved. Third-party asset credits are in [Attributions](./docs/ATTRIBUTIONS.md).
