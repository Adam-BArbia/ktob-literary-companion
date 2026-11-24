# KTOB — Architecture and service contracts v0.2

**Status (24 November 2026):** the V2 reading-journal application is deployed. The owner authorized scoped V3 implementation and release: star repair plus consent-gated Groq conversations. [V3 release evidence](../implementation/v3-release-demo.md) separates source, tests, migration, live provider checks and deployment. B13 account deletion and B15 verified seller research remain closed; Groq qualification is independently checked before activation.

This architecture package must be reviewed together with the [16 PlantUML diagrams](../uml/README.md). The [OpenAPI 3.1 design contract](openapi.json) describes the exact proposed HTTP operations. Only the [implemented-operation register](../implementation/implemented-operations.json) identifies real controller implementations; the release records establish which were deployed.

## Documents

1. [Architecture decisions](01-architecture-decisions.md)
2. [HTTP API contract catalogue](02-api-contract.md)
3. [Conceptual persistence model](03-persistence-model.md)
4. [Security and AI privacy](04-security-privacy.md)
5. [External integration and deployment](05-integrations-deployment.md)
6. [Engineering readiness and restrictions](06-review-gates.md)
7. [Gate B decision review and approval register](08-gate-b-decision-review.md)
8. [Cross-document consistency matrix](07-consistency-matrix.md)
9. [OpenAPI draft](openapi.json)
10. [Complete implementation handoff](../implementation/README.md)

## Baseline and scope

- KTOB (*Keep Thoughts On Books*) — private reader-focused literary companion.
- Angular/TypeScript/Tailwind on Vercel; Java 21/Spring Boot on Render Free; Supabase Auth and PostgreSQL.
- Initial Spring Boot topology: **one modular deployable**, not independent network microservices. REST/JSON `/api/v1` is **PROPOSED**; the earlier user-provided assignment says **"SOAP ou REST"**, so REST is permitted under the supplied wording. Additional/full formal rubric details remain unverified. See Gate B review.
- Bibliographic data via Open Library (with manual fallback). Groq with GPT-OSS 120B is selected for scoped V3 qualification. Live verified seller-research source is **BLOCKED**; never invent offer data.
- R1: library, private/manual work entry, editions (possibly unknown metadata), reading and rereading, journal, reader collections, AI conversation and recommendations with explicit processing consent, approved memory, content boundaries, R1 essentials export, historical offers and explicit acquisitions. Approved product defaults: optional 1–5 half-star rating, optional integer 0–100% progress, minimal optional onboarding, NO_SPOILERS default with explicit per-request full-book spoilers.
- R2: in-depth edition comparisons, multiple themed chats per book, fuller exports/imports, automatic offer rechecks, alerts and advanced lending analytics.

## Canonical rules — read before implementation

1. `BookWork` is one canonical work identity (global OPEN_LIBRARY or reader-private MANUAL); `BookEdition` is optional detail. Different works cannot share a library entry.
2. `LibraryEntry` belongs to one reader and work (`UNIQUE(reader_id,work_id)`), can exist with **zero** reading experiences and then projects `WANT_TO_READ`. `WANT_TO_READ` is *not* a `ReadingExperience.status`.
3. Each reading/rereading is a separate preserved `ReadingExperience`. At most one `CURRENTLY_READING` or `PAUSED` session per library entry. A historical import is explicitly flagged and may initialize a closed or paused state.
4. Deleting a library entry **archives**, preserves journals/history/offers/acquisitions and prevents adding a duplicate until restored. No destructive cascade in R1.
5. All private API resources are owner-scoped from the **verified** Supabase access token. `aiProcessingOptIn` and `personalizationOptIn` default **false**, are different consents, and every external AI dispatch requires the former immediately before sending. Entry-level journal exclusions override broader consent.
6. A recommendation response is a **batch** with request ID and 0..N items. Firm content restrictions remain effective; unknown warning evidence is not treated as verified safe.
7. A memory proposal remains pending until explicit acceptance. Revocation is terminal; editing never reactivates it.
8. Saved offers are immutable historical observations and do not imply purchase; acquisition never changes reading state. Provider-unavailable results are empty with explicit metadata.

**Implementation and release are authorized** for the scoped V3 work. A green documentation build alone does not establish live provider qualification, verified seller data, or full account deletion. See the [decision register](../implementation/11-risk-and-decision-register.md).
