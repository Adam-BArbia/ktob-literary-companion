# KTOB — 16 PlantUML Diagrams (design v0.2)

All 16 numbered files are **editable PlantUML sources** in conventional UML categories, not Mermaid. They describe a proposed model, not implemented software.

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

Draft v0.2 revised to remove mismatches documented in the [remediation matrix](../architecture/07-consistency-matrix.md). No application code or SQL migration. Human Gate B sign-off remains pending.
