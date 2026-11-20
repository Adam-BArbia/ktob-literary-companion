# Architecture decisions (review draft)

## ADR-001 — One modular Spring Boot deployment [PROPOSED]

Keep one Spring Boot deployment on Render Free with logical modules: `api`, `security`, `reader`, `library`, `catalog`, `advisor`, `acquisition`, `integration`. Responsibilities have explicit entry contracts, not cross-module direct SQL or circular dependencies. This is **not** independently deployed microservices. If the lecturer requires physical SOA services, revisit the topology before implementation.

## ADR-002 — Java owns KTOB business APIs [CONFIRMED principle]

Angular uses Supabase Auth for sign-in but calls Spring Boot for all private book/journal/business operations. The browser does not bypass Java to write private business tables through Supabase Data API. Authentication is not authorization.

## ADR-003 — Draft REST API v1 [PROPOSED]

Base path `/api/v1`; HTTPS JSON; OpenAPI 3.1 definition in `openapi.json`. All private calls require Supabase access-token bearer auth; identity comes from the *verified* token subject, not a client-provided `readerId`. Standard envelope `{data,meta?}`; errors use `application/problem+json`. Stable IDs are UUIDs, timestamps are UTC RFC3339, currencies ISO 4217, money is decimal represented as a **string**, not IEEE float.

## ADR-004 — Work / edition / private library / reading experience [CONFIRMED invariant]

A literary `Work` has 0..N `Editions`. A `LibraryEntry` links one reader to one work, with optional edition preference. A `ReadingExperience` is a separate *read or reread* and owns journal entries. Historical sessions, ratings and reflections survive rereading. Favorites, custom collections, shelf status, possession and offers are independent.

**Shelf projection:** `LibraryEntry.shelfStatus` is a **computed view** of the reader's most recent relevant reading experience, or `WANT_TO_READ` if none exists. An unstarted book does **not** require a synthetic reading session. Moving into a reading state creates or updates a session. The contract avoids storing two conflicting authoritative status values. Historical imports may assign an initial completed status with a corresponding historical experience. (Needs functional review.)

## ADR-005 — Public catalog and manual fallback [PROPOSED]

Open Library is queried via the Java adapter with application identification, caching, pagination and rate control. External IDs are stored as untrusted provenance, not universal truth. Readers can create private manual works when lookup fails, and edit local overrides without overwriting global catalog metadata.

## ADR-006 — AI permissions are layered [PROPOSED]

`aiProcessingOptIn` controls whether messages can be sent to an external model; `personalizationOptIn` separately controls using reading history, approved memories, or permitted journal entries. Both default false. Initiating a chat with explicit informed consent may enable AI processing, but must not silently enable history personalization. A journal entry's per-entry exclusion always wins. Conversation history is distinct from persistent approved memory.

## ADR-007 — Content boundaries [CONFIRMED principle]

A firm explicit content boundary applies to generated recommendations. `SURPRISE` mode never bypasses it. A temporary exception must be explicitly requested for a *single recommendation request* and logged as such; never silently modify a persistent boundary. Unknown safety data is labelled unknown, not declared safe.

## ADR-008 — Marketplace facts must be sourced [CONFIRMED principle]

Book offers must include a seller, URL, observed timestamp, provenance and optional currency/price. If the provider is unavailable the API returns an empty/unavailable result; never simulate a live seller listing. Saved offers are historical snapshots. Saving an offer or opening a seller link does not record purchase or alter reading status.

## ADR-009 — Database responsibility [PROPOSED]

Use Supabase PostgreSQL with a dedicated non-exposed `app` schema for KTOB private business tables, a non-superuser backend DB role with least-privilege access and verified reader ownership in Java. Apply RLS as defense in depth where practical. Avoid exposing tables in `public` by accident; don't assume service-role connections enforce RLS. Managed schema changes must use reviewed migration files (Flyway), not Hibernate schema auto-update in deployed environments. No SQL executed during this phase.

## ADR-010 — Free-tier behavior [PROPOSED]

One Render instance only for initial deployment. Idle suspension, cold starts, low-memory AI requests, external API failures, and retries must be treated as normal conditions. No background workers or high-frequency polling without feasibility validation.

## Decisions awaiting approval

- Whether course submission mandates SOAP/WSDL, a registry, or separate deployable service instances.
- Exact rating scale, progress units, book-work matching, and manual metadata editing rules.
- R1 export format, deletion verification procedure, and data-retention obligations.
- AI provider/model/account quota and permissions; verified bookstore provider.
