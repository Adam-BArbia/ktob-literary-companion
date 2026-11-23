# PostgreSQL  — migration-ready blueprint (not executable SQL)

Based on [UML 02/03](../uml/README.md), [conceptual model](../architecture/03-persistence-model.md), and [OpenAPI v0.3](../architecture/openapi.json). **Do not execute anything in Supabase from these instructions until Sprint 1 migration review.**

**Implementation update:** The numbered table below is the original logical plan, not the current file list. Actual Flyway files are `V1__reader_catalog_library.sql` and additive `V2__reading_experiences_and_journal.sql`. V2 creates experiences/journals, adds the entry/work composite reference and bounded constraints, and explicitly controls browser/runtime grants. [Physical mappings](../architecture/03-persistence-model.md#current-physical-mapping) and [release evidence](overnight-release-demo.md) distinguish implemented SQL from production application. Do not rename or edit an already applied migration to match the logical numbers below.

## Connectivity / schemas

Supabase Auth owns `auth.users.id`; no application password table. Store business data under a non-exposed `app` schema and revoke browser-facing roles' direct access. Java is the only caller. Prefer a dedicated least-privilege backend DB role with explicit grants for app tables/sequences and separate migration credentials; **never** use `service_role` from Angular. Verify actual server's `search_path`, JWT signing mode, TLS, and pooler settings in Sprint 1. Supabase's session pooler is intended for a persistent IPv4-only server (e.g. Render); direct access may be IPv6-only on free projects. The Flyway migration connection and application JDBC URL may differ.

## Planned migrations (create only during implementation)

| Migration content, in order | Tables / constraints | Reversibility |
|---|---|---|
| 001: namespace and identities | `app` schema, app DB role/grants through admin setup, `reader_profiles`, `privacy_settings` | Document rollback before applying |
| 002: catalog | `catalog_works`, `catalog_editions`, `contributors`, `work_credits` | Work origin + owner check |
| 003: library and readings | `library_entries`, `reading_experiences`, `journal_entries`, `collections`, `collection_entries` | Protect history from accidental cascade |
| 004: preferences and advisor | `reading_preferences`, `content_boundaries`, `conversations`, `conversation_messages`, `memory_proposals`, `approved_memories`, `recommendation_requests`, `recommendation_items`, `boundary_exceptions` | No provider API keys here |
| 005: acquisitions and idempotency | `saved_offers`, `acquisition_records`, `idempotency_records` | Observed snapshots immutable |
| 006: performance and hardening | selective indexes, CHECK constraints, policy review, anonymous-exposure audit, maintenance | Confirm plans with actual EXPLAIN |

Migration naming shown above is a **logical order**, not literal Flyway filenames. Create actual versioned `V...__...sql` files with the migration tooling when implementation starts, verify against disposable/local PostgreSQL before any remote apply. The Supabase CLI's migration-generation workflow may differ from Flyway; do not maintain two independent production migration histories for the same tables.

## Table-by-table keys/fields/relations

| Table | Proposed minimum columns | Critical checks |
|---|---|---|
| `reader_profiles` | `reader_id UUID PK FK auth.users`, `display_name varchar(100)`, `created_at`, `updated_at` | Neutral Reader default, nonblank, optional onboarding |
| `privacy_settings` | `reader_id PK/FK`, six bool consent/scope flags | All false by default; changes audit without sensitive contents |
| `catalog_works` | `work_id PK`, `origin`, `owner_reader_id NULLABLE`, `title`, `language`, `openlibrary_key`, `metadata_status`, `created_at` | OPEN_LIBRARY has null owner, MANUAL has creator ID; unique source key where present |
| `catalog_editions` | `edition_id PK`, `work_id FK`, `isbn`, `language`, `format NULLABLE`, `publisher` | An edition belongs to exactly one work; no fake format if unknown |
| `contributors` | `contributor_id PK`, `name` | Contributor role on separate credit table |
| `work_credits` | `work_id FK`, `contributor_id FK`, `role` | Composite uniqueness; translator/author role contextual |
| `library_entries` | `id PK`, `reader_id FK`, `work_id FK`, `preferred_edition_id NULLABLE`, `favorite`, `acquisition_intention`, `archived_at`, `created_at` | UNIQUE(reader_id,work_id) incl. archived; preferred edition belongs to same work |
| `reading_experiences` | `id PK`, `library_entry_id FK`, `edition_id NULLABLE`, `status`, `started_on`, `finished_on`, `rating NUMERIC(2,1) NULLABLE`, `progress_percent SMALLINT NULLABLE`, `created_at` | 1..5 steps 0.5; percentage 0..100; partial unique index for open statuses; no WANT_TO_READ |
| `journal_entries` | `id PK`, `experience_id FK`, `kind`, `body`, `emotion_tags`, `allow_for_personalization`, `created_at` | Exclusion false default; FK owner chain |
| `collections` | `id PK`, `reader_id FK`, `name`, `description`, `created_at` | Reader-private |
| `collection_entries` | `collection_id FK`, `library_entry_id FK`, `added_at` | UNIQUE pair; enforce same reader on both sides |
| `reading_preferences` | `id PK`, `reader_id FK`, `category`, `description`, `source`, `active` | Distinguish user-entered from explicitly approved |
| `content_boundaries` | `id PK`, `reader_id FK`, `category`, `firm`, `active` | Request exceptions never edit base boundary |
| `conversations` | `id PK`, `reader_id FK`, `kind`, `work_id NULLABLE`, `title`, `created_at` | Private manual book visibility if workId set |
| `conversation_messages` | `id PK`, `conversation_id FK`, `role`, `body`, `spoiler_level NULLABLE`, `full_book_spoilers_confirmed NULLABLE`, `created_at` | Effective per-turn spoiler policy, not global setting; no unauthorized older full-spoiler context |
| `memory_proposals` | `id PK`, `reader_id`, `source_message_id FK`, `suggested_text`, `status`, `created_at` | Source assistant message belongs to same reader; PENDING until explicit decision |
| `approved_memories` | `id PK`, `proposal_id FK UNIQUE`, `reader_id`, `text`, `approved_at`, `revoked_at NULLABLE` | One approved memory per proposal, terminal revoke |
| `recommendation_requests` | `id PK`, `reader_id`, `mode`, `use_personal_context`, `spoiler_level`, `full_book_spoilers_confirmed`, `created_at` | Per-request policy; NO_SPOILERS default |
| `recommendation_items` | `id PK`, `request_id FK`, `work_id FK`, `explanation`, `warning_confidence`, `source` | 0..N; unknown is not safe |
| `boundary_exceptions` | `request_id FK`, `boundary_id FK`, `explicitly_authorized` | One per request+boundary; same reader owner |
| `saved_offers` | `id PK`, `library_entry_id FK`, `seller_name`, `source_url`, `source_type`, `observed_at`, `listed_price NULLABLE`, `currency NULLABLE`, `availability` | Immutable timestamp/provenance; currency and price paired, nonnegative |
| `acquisition_records` | `id PK`, `library_entry_id FK`, `edition_id NULLABLE`, `access_type`, `acquired_on`, `paid_price NULLABLE`, `currency NULLABLE`, `seller`, `notes` | Pair constraint; owner/active parent on writes; never changes reading |
| `idempotency_records` | `reader_id`, `method`, `path`, `key UUID`, `request_hash`, `response_code/body`, `expires_at` | UNIQUE reader/method/path/key, TTL >=24h candidate |

The *exact* SQL table column names must be fixed in an initial migration review. `rating` should be stored as exact `NUMERIC(2,1)` (1.0–5.0, half steps); `progress_percent` integer/smallint check 0–100. The conceptual schema **is not a deployed migration**.

## Cross-row business invariants

- Ensure edition FK belongs to the same `catalog_works` as parent library entry: composite key/constraints or Java authorization in one transaction with matching DB tests.
- Collection membership's two parents must both belong to the same reader; enforce with composite FK or constraints in addition to Java guards.
- Only one open reading experience per entry via partial UNIQUE index on parent FK WHERE status in ('CURRENTLY_READING','PAUSED'); historical terminal records unaffected.
- Shelf projection: one open if exists; else latest closed by `COALESCE(finished_on,started_on)` DESC NULLS LAST, `created_at` DESC, `id` DESC; none => WANT_TO_READ.
- No default cascade on library archive: `archived_at` is a state change, not deletion. Every descendant mutation verifies owner first and archived state second (409); historic owner GET still works.
- Export includes own archived entries, all own associated experiences/journal, collections and preferences. No cross-owner leaked manual work or journal.
- Catalog provenance: Open Library IDs may be absent or malformed, user-created works always owner-private. Avoid editing global sourced metadata using reader-local form.
- Spoiler per-turn audit, consent flags and allowed journal selection must not become accidental permanent personalized memories. Keep sanitized, bounded logs.

## Indices, connections, safety

Indices: library(reader_id,archived_at,created_at,id), reading_experiences(library_entry_id,created_at,id), journal(experience_id,created_at,id), collections(reader_id,created_at), messages(conversation_id,created_at,id), saved_offers(library_entry_id), acquisition_records(library_entry_id), consent/profile PK. Use btree keyset pagination; measure actual needs before exotic indexes. Prefer direct or session-pooled JDBC TLS connections for persistent Spring Boot on Render, bounded pool, no transaction-pooler prepared-statement surprises.

**Security verification before migration application:** schema exposure settings, grants on tables/sequences, no `anon/authenticated` business access, bypass-RLS implications, no vulnerable SECURITY DEFINER functions/views, cross-reader IDOR and FK tests. Use disposable Postgres or local Supabase for test; review actual generated SQL in PR and require separate explicit approval for production apply.
