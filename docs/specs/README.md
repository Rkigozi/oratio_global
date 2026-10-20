# Historical Prototype Specifications

These files preserve the original PWA/prototype proposals. They are not the
current iOS release baseline and must not be used as an implemented API/schema
contract. For example, the localStorage-only identity and proposed custom REST
endpoints do not describe the current Supabase-backed app.

Use the [active design index](../design/README.md),
[requirements](../design/REQUIREMENTS.md), [HLD](../ARCHITECTURE.md) and
[domain LLDs](../design/README.md#low-level-designs) instead. Current evidence is
in [release readiness](../V1_RELEASE_READINESS.md), [QA](../QA-CHECKLIST.md) and
the [NFR register](../NFR-CHECKLIST.md).

| Historical File                             | Original Purpose                                                      |
| ------------------------------------------- | --------------------------------------------------------------------- |
| [v1.0 requirements](./v1.0-requirements.md) | Superseded PWA release proposal                                       |
| [MVP scope](./MVP-Scope.md)                 | Original minimal product boundary                                     |
| [Data model](./Data-Model.md)               | Proposed future schema for the prototype                              |
| [API behaviours](./API-Behaviours.md)       | Proposed custom REST API, not the current SDK/RPC contract            |
| [User flows](./User-flows.md)               | Original anonymous-first journeys                                     |
| [Screen specs](./Screen-Specs.md)           | Original prototype screens/states                                     |
| [Design system](./Design-System.md)         | Early visual guidance, not current native theme tokens                |
| [Safety/moderation](./Safety-Moderation.md) | Early proposal, superseded by implemented reporting/moderation design |

Do not implement a historical proposal just to make code match this directory.
If an old idea is useful, explicitly adopt it into an active requirement/story.
