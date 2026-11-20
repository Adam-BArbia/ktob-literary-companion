# Architecture decision record — remediation v0.2

All decisions in this document are either **CONFIRMED product invariants**, **PROPOSED design rules** awaiting human approval, or **BLOCKED** by external evidence.

## ADR-001 — Deployable structure [PROPOSED]

One Java 21 / Spring Boot modular application runs on Render Free; Angular + TypeScript + Tailwind runs on Vercel; Supabase Auth and PostgreSQL supply identity and storage. Modules: `api`, `security`, `reader/privacy`, `export`, `library/journal/collections`, `catalog`, `advisor`, `acquisition`, `provider adapters`, `shared contracts`. A module is a logical boundary, **not** an independently deployed microservice. The `export` coordinator depends on read-only interfaces of reader, library and advisor; advisor can read reader privacy contracts without a circular dependency.

## ADR-002 — SOA protocol [BLOCKED]

Proposed HTTP/JSON REST under `/api/v1`, documented by OpenAPI. The professor's actual assessment text has not been verified. If it mandates SOAP/WSDL, a registry or independently deployed services, revise architecture *before* implementation.

## ADR-003 — One authoritative work identity [PROPOSED]

`catalog_works.work_id` identifies **both** externally sourced and private manual works. `origin=OPEN_LIBRARY` implies `owner_reader_id IS NULL` and globally readable metadata. `origin=MANUAL` requires `owner_reader_id` equal to creator and visibility only to that reader. Editions reference this same work ID. No independent `manual_works.id` namespace or polymorphic library FK. Private manual works cannot be referenced, enumerated, or inferred by others. Reader-specific metadata overrides are deferred to R2. Work contributors are reusable people; their role is on the **work–contributor credit** association, not on the person.

## ADR-004 — Library shelf and reading state [PROPOSED, canonical R1]

A `LibraryEntry` with no `ReadingExperience` projects shelf `WANT_TO_READ`. That value is never stored as `ReadingExperience.status`.

**Projection algorithm:**
1. Use the single open experience (status `CURRENTLY_READING` or `PAUSED`) if one exists.
2. Otherwise choose the closed experience with maximum reading-chronology key: `COALESCE(finished_on, started_on)` **NULLS LAST**, then `created_at` descending, then immutable experience UUID descending. `FINISHED` and `DID_NOT_FINISH` are terminal.
3. If no experience, return `WANT_TO_READ`.
4. Historical imports may begin in `FINISHED`, `PAUSED` or `DID_NOT_FINISH` only when `historicalImport=true`; conflicts with an existing open session return `409` or `422`. A new real reading starts `CURRENTLY_READING`.
5. One library entry cannot have two simultaneous open experiences. Reread creates a new record and leaves old dates, ratings and journal notes untouched. Progress units and rating scale remain product decisions.

This avoids two persisted and potentially conflicting authoritative statuses.

## ADR-005 — Library deletion [PROPOSED]

`DELETE /library/{entryId}` is an **idempotent soft archive** (`archivedAt`); it preserves experiences, journal, collection memberships, historical saved offers, acquisitions, and optional preferred edition. Default library/collection lists hide archived entries; readers can list their own archived entries and explicitly restore with `POST /library/{entryId}/restore`. A duplicate `POST /library` (including archived entries) returns `409`; no destructive cascade. Full account deletion is **BLOCKED** pending reauthentication, purge, and retention policy.

## ADR-006 — AI processing versus personalization [PROPOSED]

`aiProcessingOptIn` **false by default** prevents *all* external AI calls, including generic prompts. Missing processing consent yields `403 AI_PROCESSING_CONSENT_REQUIRED`; unavailable AI provider yields `503`. A clearly implemented non-AI alternative could be offered separately but is not silently invoked by these routes. `personalizationOptIn` independently enables allowable history only if `usePersonalContext=true` for that request, relevant scope flags are true, and journal `allowForPersonalization=true`. No use of user text beyond what the consent permits. Recheck processing consent immediately before **each provider dispatch**. Revoking consent after dispatch cannot undo an already sent request.

## ADR-007 — Recommendations, content restrictions and memory [PROPOSED]

`POST /recommendations` returns `RecommendationResult` with `requestId`, `items: Recommendation[]` (0..N), `providerStatus`, uncertainty/provenance. Request and item records can be persisted, linked by `request_id`. Firm reader-set boundaries apply to all recommendations including `SURPRISE`; exceptions are explicit, recorded and scoped to **one recommendation request**. If content warnings are unknown, the candidate cannot be certified as safe against that firm boundary. Memory proposals originate from an owned assistant message; approval is explicit and creates at most one reader-owned approved memory. `DELETE /memories/{id}` terminally revokes; `PATCH` changes text only for active approved memories.

## ADR-008 — Collections and offers [PROPOSED]

Collection membership joins must belong to one reader; GET members is paginated with deterministic order. PUT membership is idempotent and returns `204`.

`SavedOffer.observedAt` is immutable and identifies a historical observation, `sourceType` differentiates `USER_SUPPLIED` from `VERIFIED_PROVIDER`. No R1 automatic rechecking or price alerts. Verified offers require a validated provider (**BLOCKED**); unconfigured searches return `data=[]` with `meta.providerStatus=UNAVAILABLE`. No purchase inferred from visit/save. Explicit acquisition is independent of reading.

## ADR-009 — Privacy, persistence and export [PROPOSED]

Business tables in a private, non-Data-API-exposed `app` schema, using a dedicated least-privilege Spring Boot database role. Java verifies Supabase token and scopes all private records to `reader_id`; never depend solely on RLS or allow the frontend to use service-role credentials. Review RLS defense-in-depth and privileged role behavior. Export belongs to logical `export` module and returns R1 JSON with precisely: `library`, `experiences`, `journal`, `collections`, `preferences`. Conversations, memories, offers, acquisitions and deletions are excluded from **this limited archive**, not from ordinary account privacy obligations. Use Flyway only *after* approval.

## ADR-010 — Error/idempotency model [PROPOSED]

RFC 9457 problem responses. `404` for absent/other-user items, `409` duplicate work/membership concurrency, `422` invalid reading transitions/edition mismatch. `Idempotency-Key` optional UUID for message, recommendation and acquisition creation, scoped to reader+method+path, stored for at least 24h (proposed); exact replay returns same response; same key with a different body yields `409`. Cursors are opaque and reader-scoped, limit 1..100.

## ADR-011 — Provider constraints [BLOCKED/PROPOSED]

Open Library is a proposed metadata provider with rate-limited calls and manual fallback. AI vendor/model account eligibility, retention and free allowance are unconfirmed; offer provider is entirely unselected. No invented seller names, prices, coverage, warning certainty or stock. Render Free sleep/cold starts and memory must be tested before deployment.

## Human decisions

See [review gates](06-review-gates.md), especially the professor's rubric, rating scale, progress units, AI policy, export and full deletion semantics. No product or implementation approval is implied by this draft.
