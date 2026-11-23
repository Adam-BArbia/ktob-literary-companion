# KTOB — 16 PlantUML Diagrams (design v0.2)

All 16 numbered files are **editable PlantUML sources** in conventional UML categories, not Mermaid. They describe the full R1 architecture, including features still planned. Consult the [implemented operation register](../implementation/implemented-operations.json) and [release evidence](../implementation/overnight-release-demo.md) for the implemented and deployed subset.

| # | Model | File |
|---|---|---|
| 01 | Reader use cases | [01-use-cases.puml](01-use-cases.puml) |
| 02 | Library, works, editions, readings, acquisition domain classes | [02-domain-library.puml](02-domain-library.puml) |
| 03 | AI privacy, memory, recommendation domain classes | [03-domain-advisor.puml](03-domain-advisor.puml) |
| 04 | Logical components (one Java deployment) | [04-components.puml](04-components.puml) |
| 05 | Deployment nodes: Vercel / Render / Supabase / adapters | [05-deployment.puml](05-deployment.puml) |
| 06 | Logical package dependencies | [06-packages.puml](06-packages.puml) |
| 07 | Search, manual work creation and library add | [07-sequence-add-book.puml](07-sequence-add-book.puml) |
| 08 | Start/reread/historical reading and journal | [08-sequence-reading-journal.puml](08-sequence-reading-journal.puml) |
| 09 | Consent-gated batch recommendations | [09-sequence-recommendation.puml](09-sequence-recommendation.puml) |
| 10 | Consent-gated chat and proposed memory approval | [10-sequence-memory.puml](10-sequence-memory.puml) |
| 11 | Verified/unavailable offer research, historical saved offers, acquisition | [11-sequence-acquisition.puml](11-sequence-acquisition.puml) |
| 12 | Reader-scoped R1 essential JSON export | [12-sequence-export.puml](12-sequence-export.puml) |
| 13 | End-to-end activity | [13-activity-reading-journey.puml](13-activity-reading-journey.puml) |
| 14 | ReadingExperience state machine, no WANT_TO_READ persisted | [14-state-reading.puml](14-state-reading.puml) |
| 15 | Proposed/approved/revoked memory lifecycle | [15-state-memory.puml](15-state-memory.puml) |
| 16 | Simple R1 saved-offer lifecycle, no automatic recheck | [16-state-offer.puml](16-state-offer.puml) |

See [Architecture contracts](../architecture/README.md) and the [consistency matrix](../architecture/07-consistency-matrix.md) for detailed DTO mappings, persistence constraints, approval gates and external provider blockers.

## Invariants

- `BookWork` has a single work UUID, either public OPEN_LIBRARY with **zero** reader owners, or private MANUAL with **exactly one**. UML owner multiplicity is conditionally 0..1. Roles belong to `WorkCredit` (the work–person association).
- `BookEdition.format` may be **null** if unknown, not mislabeled OTHER.
- Each `ReadingExperience.rating` is optional 1–5 in 0.5 steps; `progressPercent` is optional integer 0–100 and never implicitly changes reading status. Profile onboarding is optional and `displayName` is the only editable R1 profile field.
- AI conversation/recommendation requests default to `NO_SPOILERS`; `FULL_BOOK_SPOILERS` requires explicit same-request confirmation and never bypasses firm content boundaries or processing consent.
- `LibraryEntry` uniquely associates reader and work. It may have no reading experience: projected `WANT_TO_READ`. A reading experience never stores that value. At most one open experience; rereading creates a fresh experience without overwriting old notes.
- Library DELETE archives with `archivedAt` and keeps history and memberships. An archived entry and descendants remain owner-readable but read-only (409 LIBRARY_ENTRY_ARCHIVED on writes) until explicit restoration. Default collection lists hide archived members and re-expose preserved memberships after restoration.
- `aiProcessingOptIn=false` stops **every** external AI call; `personalizationOptIn` separately controls selected history. Per-entry journal exclusions always apply.
- Recommendations return `RecommendationResult` with 0..N items and source uncertainty; content boundaries and exceptions are reader-controlled and request-scoped.
- Only explicitly approved memory can be used later; revocation is terminal. No automatically inferred reader preferences.
- Saved offers preserve immutable `observedAt`; they never imply purchase. Acquisition never implicitly moves reading status.
- **One modular Spring Boot runtime**, not independently deployed microservices; REST still subject to professor's unverified requirements.

## VS Code

Use *PlantUML by jebbs* for `.puml` previews (normally Alt+D). The separate *Plan UML* extension uses a different renderer. GitHub CI checks parser syntax and renders 16 SVG diagrams. UML parser success is distinct from cross-document semantic validation.

## Status

R1 product-default approvals on 2026-11-20 are reflected in the UML and OpenAPI contracts. The application now has real Java/Angular code and versioned SQL migrations. The 24 November reading-journal release implements ratings, reading lifecycle and journal/favorites workflows; deployment and verification are recorded separately. Collections, acquisition, export and advisor diagrams remain design contracts unless their operations appear in the implementation register. AI/seller/deletion gates remain separate.

The library domain diagram remains conceptual: `ReadingExperience.createdAt` is an internal ordering field, absent from the HTTP response; V1 stores author names in `catalog_works.authors`, with normalized contributors/credits still planned. V2 physical reading/journal keys and constraints are described in the [persistence model](../architecture/03-persistence-model.md).
