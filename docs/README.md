# Oratio Documentation

Last reviewed: 2026-10-21. Entry point for engineering design, development,
verification and release documentation.

## Product And Delivery Order

**Oratio is an iOS product with a supporting website and a shared backend.**
The website provides supporting public and operational services.
Superseded specifications are available in Git
history rather than maintained as a parallel design baseline.

The V1 delivery sequence is:

1. **Mobile implementation and development acceptance.** Implement V1 features,
   resolve defects and complete physical-iPhone functional QA and development quality checks.
2. **Signed-build validation.** Configure signing and distribute a committed
   candidate after development acceptance, activation of Apple Developer Program
   membership and release approval. Verify signed-build requirements in TestFlight.
3. **Public release preparation.** Convert the public site,
   verify production links/operations, complete signed-build
   acceptance and submit to Apple. Website work belongs to this release stage,
   after mobile implementation and development acceptance.
4. **Post-iOS delivery.** Android and growth work are outside the initial release scope.

Builds, deployments and provider changes require the applicable change/release
review. A public launch date has not been scheduled.

## Platform Responsibilities

| Surface                | Responsibility                                                                                            | Delivery boundary                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| iOS app, `apps/mobile` | Prayer journeys, profiles, Circle, map and native settings                                                | Expo Go development; signed validation and store release are separate stages |
| Website, `apps/web`    | Public information, policies/support, recovery, authorised link fallbacks and protected operational tools | Netlify deployment; public-site conversion remains planned                   |
| Shared backend         | Supabase Auth/data/storage/realtime and authoritative access controls                                     | Approved migrations and server deployments affect dependent clients          |

The current web route map still contains authenticated product screens. Their retirement
is bounded by the [website plan](./backlog/WEB-PRESENCE.md).

## Find The Right Document

| Engineering concern                                | Authoritative document                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Delivery sequence and release gates                | [Release readiness](./V1_RELEASE_READINESS.md)                                           |
| Local development                                  | [Quick Start](./QUICK-START.md)                                                          |
| Product behaviour                                  | [Requirements](./design/REQUIREMENTS.md)                                                 |
| System architecture                                | [HLD](./ARCHITECTURE.md)                                                                 |
| Detailed contracts                                 | [Domain LLDs](./design/README.md#low-level-designs)                                      |
| Requirement/story ownership                        | [Traceability](./design/TRACEABILITY.md)                                                 |
| Functional verification and reported manual checks | [Functional QA](./QA-CHECKLIST.md) and linked feature records                            |
| Quality acceptance and test tooling                | [NFR register](./NFR-CHECKLIST.md) and [test strategy](./guidelines/TESTING_STRATEGY.md) |
| Source navigation                                  | [Codebase guide](./CODEBASE_NAVIGATION_GUIDE.md)                                         |
| Story workflow and evidence                        | [Backlog agreement](./backlog/README.md)                                                 |
| Signed-build distribution                          | [iOS build runbook](./backlog/IOS-BUILD-PIPELINE.md)                                     |
| Supporting website scope                           | [Website plan](./backlog/WEB-PRESENCE.md)                                                |
| Documentation conventions                          | [Documentation standard](./guidelines/DOCUMENTATION.md)                                  |

## Keep Status Unambiguous

Requirements describe intended behaviour. HLD/LLDs describe boundaries and
contracts. Feature runbooks own dated implementation, rollout and test evidence;
the checklist owns acceptance. Link to that evidence rather than copying its
entire timeline into every overview. Jira snapshots are dated, not live mirrors.

Use precise statements: **implemented locally**, **committed/pushed**, **backend
applied**, **website deployed**, **device-tested** and **signed-build accepted**
are separate states. Feature completion, NFR acceptance and release approval
have independent evidence requirements.
