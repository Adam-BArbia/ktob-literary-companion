# Conceptual Supabase PostgreSQL model — design draft v0.2 (NOT SQL)

Tables and constraints below are candidates. **No SQL, migrations, RLS policy or live database change has been performed.** Derived from [UML library](../uml/02-domain-library.puml) and [UML advisor](../uml/03-domain-advisor.puml).

## Ownership and canonical identity

`auth.users.id` is authoritative for each reader. Proposed private, **non-exposed** `app` schema holds all business tables. Spring Boot operates using a restricted database role and must independently verify Supabase access-token identity and owner-scoped access; service/admin database connections can bypass RLS, so RLS is not a substitute for Java ownership checks. Never expose `service_role` credentials to Angular.

**One works table, not two ID namespaces:** `app.catalog_works(work_id, origin, owner_reader_id, ...)`. When origin is `OPEN_LIBRARY`, `owner_reader_id IS NULL`, source ID/provenance recorded, available for reads; for `MANUAL`, owner UUID is required and work visible *only* to that owner. `catalog_editions(work_id,...)` and `library_entries(work_id,...)` use a normal FK to this **same** work table. No separate `manual_works` table; reader-local metadata overrides are deferred.

`contributors(contributor_id,name,...)` identifies a person; `work_credits(work_id,contributor_id,role)` attaches AUTHOR/EDITOR/TRANSLATOR/OTHER per work. A contributor can be author on one work and translator on another. Credit uniqueness is per combination; metadata remains incomplete/unknown where relevant.

## Candidate relations

| Relation | Ownership path | Key requirements |
|---|---|---|
| `reader_profiles` | `reader_id = auth.users.id` | 1:1 |
| `privacy_settings` | `reader_id` | Both AI consent flags + all scopes default false |
| `content_boundaries` | direct `reader_id` | Firm and active flags |
| `reading_preferences` | direct `reader_id` | Reader-entered / AI-approved provenance |
| `catalog_works` | owner null if global, user ID if private manual | `work_id` unique, enforce origin/owner pair |
| `catalog_editions` | work | Zero or more; format nullable when genuinely unknown |
| `contributors`, `work_credits` | work credit | Role stored on credit, not contributor |
| `library_entries` | direct `reader_id` | `UNIQUE(reader_id,work_id)`; nullable preferred edition; `archived_at` nullable |
| `collections` | direct `reader_id` | Per-reader named collections |
| `collection_entries` | collection + entry -> same reader | unique pair; ordered by `added_at,entry_id` |
| `reading_experiences` | entry -> reader | status never WANT_TO_READ; preserve rerereads; no concurrent open |
| `journal_entries` | experience -> entry -> reader | kind, body, tags, allow_for_personalization |
| `conversations` | direct `reader_id` | kind GENERAL/BOOK_MAIN; optional work access check |
| `conversation_messages` | conversation -> reader | role USER/ASSISTANT equivalent to READER/ASSISTANT UML |
| `memory_proposals` | source assistant message -> conversation -> reader | one reader, lifecycle; no direct approval without action |
| `approved_memories` | proposal and direct reader | unique proposal ID, approved_at; revoked_at null unless terminal |
| `recommendation_requests` | direct reader | mode, use_personal_context, consent audit |
| `recommendation_items` | recommendation request -> reader | 0..N, work ID, explanation, provenance and unknown warnings |
| `boundary_exceptions` | request and boundary -> same reader | explicit exception, per request only |
| `saved_offers` | library entry -> reader | observed_at immutable, seller URL, source_type, historical price |
| `acquisition_records` | library entry -> reader | explicit access type; no shelf side effect |
| `idempotency_records` [PROPOSED] | reader | unique reader, method, path and key; request fingerprint, response, expiry |

## Referential, uniqueness and lifecycle constraints

1. Work global/private XOR origin: `OPEN_LIBRARY => owner_reader_id IS NULL`; `MANUAL => owner_reader_id IS NOT NULL`. Java always resolves private works against authenticated owner.
2. `UNIQUE(library_entries.reader_id,library_entries.work_id)` includes archived entries. `preferred_edition_id` and experience/acquisition edition FK must point to an edition of the same work. Use application validation backed by composite references or an equivalent database constraint.
3. Collection membership belongs to exactly the same reader as both collection and library entry. Use redundant `reader_id` constrained by composite FKs or equivalent transactional enforcement plus tested Java guard; prohibit cross-reader references.
4. A library entry with no experience projects `WANT_TO_READ`. Store **only** valid reading experience statuses `CURRENTLY_READING`, `PAUSED`, `FINISHED`, `DID_NOT_FINISH`.
5. Only one open experience (status CURRENTLY_READING or PAUSED) per library entry, through a partial unique index or equivalent transactional guard. Initial actual reading = CURRENTLY_READING; initial PAUSED/FINISHED/DID_NOT_FINISH requires explicit historical import. FINISHED and DID_NOT_FINISH are terminal.
6. Derived shelf: use open experience if any; else select closed experience ordered by `COALESCE(finished_on,started_on)` descending NULLS LAST, `created_at` descending, `experience_id` descending; if no experience, WANT_TO_READ. Do not persist a separately authoritative shelf status.
7. Rereads insert fresh experiences and do **not** change older notes/ratings. Optional journal entries use a per-entry `allow_for_personalization` flag defaulting false.
8. Archive a library entry by setting `archived_at`; do **not** cascade-delete child experiences, journals, collection membership, saved offers or acquisitions. Default views omit archived entries, but they remain in R1 essentials export (clearly marked) unless user export filters are separately approved. Restoration clears `archived_at`.
9. A `memory_proposal` is linked to an assistant message **owned by the same reader**; only an APPROVED proposal can create **one** corresponding approved memory. Revocation sets `revoked_at`, terminal; no generic reactivation.
10. Boundary exception is unique per request and boundary, both owned by same reader. AI-generated guesses alone are never treated as verified content safety.
11. Saved-offer `observed_at` is immutable. Money stored in numeric fixed precision, sent in HTTP DTOs as decimal strings. Price and ISO 4217 currency must be provided together or both null; non-negative price. Unknown availability must be representable.
12. Deletion of an individual journal note or saved offer follows its documented endpoint; archiving a library entry does not delete children. Full reader/account deletion is **BLOCKED** pending a separate, audited purge/retention policy.
13. R1 export queries exactly `library_entries` (including own archived), `reading_experiences`, `journal_entries`, `collections`, `reading_preferences` and emits five arrays. It does not claim to include conversations, memories, saved offers or acquisitions.


## Final targeted referential and monetary invariants

- A global OPEN_LIBRARY work has **zero** owning readers; a MANUAL work has **one**. Preserve one `catalog_works.work_id` namespace and the origin/owner consistency check.
- For all entry/child write transactions, verify reader ownership before inspecting archived state. An owned `archived_at IS NOT NULL` prevents library PATCH, reading experience/journal writes, collection-membership mutations, saved offer modifications and acquisition modifications with `409 LIBRARY_ENTRY_ARCHIVED`. Historical owner-only GET remains allowed. Archive and restore are the allowed exceptions. Preserve memberships while hidden from default collection lists and re-expose when restored.
- `acquisition_records.paid_price` must be nonnegative or null; `currency` is a supported active ISO 4217 uppercase code or null. Conceptual check: `(paid_price IS NULL) = (currency IS NULL)`. A partial PATCH validates its **merged** persisted record atomically, not the partial body independently. Reject invalid pairs with 422.
- Budget filtering on sourced offers uses `maxPrice` only with an explicit `currency`; filter known prices with the same quote currency and exclude unknown/cross-currency entries. No automatic FX assumption. This is an adapter/API check, not a change to saved historical values.

## Suggested types and future migration rules

UUID keys, `timestamptz` event times, `date` reading dates, `numeric(12,2)` prices, `text` for reflections, JSONB only for provenance/variable source fields. Restrict external URLs to trusted/validated `https:` where possible. In exposed schemas enable RLS; private schema should use least privilege, independent Java authorization and defense-in-depth RLS where practical. For service-role/bypass-RLS connections, explicitly scope SQL to verified reader.

After human approval: author versioned Flyway migrations, choose secure connection settings appropriate for Render/Supabase, write cross-reader isolation and referential tests. Do not create migrations before the design gate.
