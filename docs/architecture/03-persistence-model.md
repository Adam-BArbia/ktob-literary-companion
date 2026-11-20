# Conceptual persistence model (NOT SQL)

Derived from [library classes](../uml/02-domain-library.puml) and [advisor/privacy classes](../uml/03-domain-advisor.puml). These are **candidate relations** and constraints for design review—not executable SQL or final migration names.

## Data boundaries

- **Supabase `auth.users`**: authoritative identity. Never duplicate passwords or use editable `user_metadata` for authorization.
- **`app` schema**: proposed private tables, accessible only to constrained backend role; front-end uses Supabase Auth but not direct business-table CRUD.
- **Reference/catalog data**: externally sourced works and editions, plus reader-private manual works; preserve provenance and optional/unknown fields.
- **Reader-owned data**: all library, journal, preferences, memory, conversations, and acquisitions must have an unambiguous owner chain.

## Candidate entities and unique constraints

| Concept | Key(s) and ownership | Constraint/invariant |
|---|---|---|
| reader_profiles | `reader_id` = Supabase Auth user UUID | Exactly one per user |
| privacy_settings | `reader_id` | Defaults AI processing=false, personalization=false |
| content_boundaries | `id`, `reader_id` | Explicitly selected; enforce across recommendations |
| reading_preferences | `id`, `reader_id` | Distinguish reader-entered and AI-approved sources |
| catalog_works | `work_id` | External identity may be missing; store provenance |
| catalog_editions | `edition_id`, `work_id` | Zero or more editions per work |
| contributors / work_contributors | composite association | A work can have multiple authors, translators etc. |
| manual_works | `id`, `reader_id` | Private by default; never public by accident |
| library_entries | `id`, `reader_id`, work reference | Unique (reader, work); `favorite` independent |
| collections | `id`, `reader_id` | Reader-created; ordered display separately |
| collection_entries | `collection_id`, `library_entry_id` | Unique pair; both must have same owner |
| reading_experiences | `id`, `library_entry_id` | Each reread is new; preserve old sessions |
| journal_entries | `id`, `experience_id` | Different journal kinds; independent AI exclusion |
| conversations | `id`, `reader_id` | General or per-book primary; no R2 topic threads in R1 |
| conversation_messages | `id`, `conversation_id` | Role, timestamp, content; no implicit journal entry |
| memory_proposals | `id`, `reader_id`, `message_id` | Pending/approved/dismissed/revoked |
| approved_memories | `id`, `reader_id`, `proposal_id` | Only reader-approved persisted memory |
| recommendation_requests | `id`, `reader_id` | Mode, explicit personalization choice, timestamp |
| recommendation_items | `id`, `request_id`, `work_id` | Explanations and provenance; suggestions may be uncertain |
| boundary_exceptions | `id`, `request_id`, `boundary_id` | One request only; explicit reader act |
| saved_offers | `id`, `library_entry_id` | Seller URL, observed time, historical price |
| acquisition_records | `id`, `library_entry_id` | OWNED/BORROWED/DIGITAL etc.; independent from reading |
| export_jobs [OPTIONAL] | `id`, `reader_id` | Only if synchronous R1 export proves insufficient |

## Critical relational invariants

1. A user can have **one library entry for a work** but multiple reading experiences (rereads); edition choice lives on the experience or acquisition.
2. `WANT_TO_READ` is the default shelf projection when no reading experience exists. Shelf may be derived from the latest experience, avoiding conflicting independent status sources. This decision needs review when retroactive or concurrent reading is supported.
3. Journals are optional; quote, feeling and reflection fields should preserve original wording and language, not impose sentiment classification.
4. Manual works should be **private** to their creator unless deliberately published; API work IDs must not accidentally expose other users' private manual works.
5. `collection_entries` cannot connect entries belonging to another reader; enforce in Java and ideally by database constraints or policies.
6. AI memories require accepted proposals; raw chat content must never silently populate `approved_memories`.
7. Clearing personalization consent prevents future context disclosure. Retention/deletion of existing conversations, messages and caches requires explicit policy.
8. Saved offers have `observed_at` and provenance; no automatic or inferred order/purchase.
9. Private resources should be scoped by verified `reader_id` before any read/update/delete; choose `404` for cross-account resource lookups.
10. Destructive account deletion must address auth user, associated app records, exports and third-party stored traces according to the approved retention policy.

## Data types (proposed)

UUID primary keys; `timestamptz` UTC for technical timestamps; `date` for reading dates; `numeric(12,2)` for prices (or higher precision if needed); `text` for journal/quote content; JSONB only for truly flexible provenance, not to avoid modelling relationships. ISO 639 language tags where possible. Restrict external URLs to HTTPS where appropriate.

## Migration and access review

- Use reviewed, versioned **Flyway** migrations after the model is approved.
- Supabase docs suggest the Spring Data JPA **session pooler** for persistent IPv4-hosted services; transaction mode can conflict with prepared statements.
- Disable Hibernate schema auto-updates in deployment. No migrations until approval.
- Verify RLS for all exposed schemas and protection for privileged views/functions.
- Plan export/delete integration tests with at least two different readers to prove isolation.
