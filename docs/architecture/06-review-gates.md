# KTOB review gates after consistency remediation

## Gate A — documentation remediation

All 16 UML sources are preserved with the original filenames. OpenAPI includes 57 deliberate R1 operations (55 originally audited + collection-member GET + library restore POST), with corrected DTOs, reading states, recommendation batch, offer metadata and consent controls. Cross-document matrix is at [07-consistency-matrix.md](07-consistency-matrix.md). **Technical validation is necessary but does not grant product approval.**

## Gate B — human architecture review (NOT yet approved)

**R1 product defaults B01–B12 and B14 approved by the user (2026-11-20)**. The UML/OpenAPI/persistence contracts were updated accordingly. This **does not** mean the full architecture Gate B is signed off; external-provider selection, full-account-deletion/retention policy and any additional academic rubric details are still open. Gate C remains closed.

The [approved R1 product-default register](08-gate-b-decision-review.md) records user-reported assignment wording, current academic evidence and reader-approved product choices. Overall Gate B remains open. It does not authorize implementation.

- [x] Recover the earlier user-provided assignment wording: **"SOAP ou REST"** permits REST; frontend must consume Java service and Java must consume a free external web service. This is based on the user's prior statement, not an attached official PDF.
- [ ] Check whether a later complete rubric adds extra demonstration/registry/deployment instructions, and confirm validation date (**unverified**).
- [x] Approve one Spring Boot modular deployable versus required physical services. **(Approved as R1 product default; implementation pending.)**
- [x] Approve canonical work global/private visibility and handling of near-duplicate catalog works. **(Approved as R1 product default; implementation pending.)**
- [x] Approve shelf projection, historical imports, single-open reading and terminal states. **(Approved as R1 product default; implementation pending.)**
- [x] Approve non-destructive library archive/restore and what appears in collection lists and R1 exports. **(Approved as R1 product default; implementation pending.)**
- [x] Approve or amend decision proposals B05–B08: rating scale, typed progress percentage, minimal profile fields, and explicit spoiler level. **(Approved as R1 product default; implementation pending.)**
- [x] Approve consent defaults, scope model and per-journal exclusion semantics (B09); **provider retention/feasibility still BLOCKED**, and consent UX implementation not started.
- [x] Approve uncertain content-warning behavior and explicit request-scoped exceptions. **(Approved as R1 product default; implementation pending.)**
- [ ] Select and independently verify a seller-research source/coverage/legal use (**BLOCKED**).
- [x] Approve memory proposal traceability and terminal revocation. **(Approved as R1 product default; implementation pending.)**
- [x] Approve B12 R1 five-array JSON essentials export as *partial*, not complete archive. Complete portability remains unapproved.
- [ ] Approve full account deletion: recent reauth, revocation, retention, third-party data (**BLOCKED**); note full data erasure differs from the five-array essentials export.
- [x] Review idempotency key retention and request-body replay behavior. **(Approved as R1 product default; implementation pending.)**
- [ ] Run PlantUML parser/render checks and maintained OpenAPI validation in CI (see workflow), plus semantic parity checks.
- [ ] Confirm no orphaned foreign keys/cross-reader collection/memory references.
- [ ] Final human Gate B architecture sign-off: ensure all approved defaults are consistently represented in 16 UML diagrams, OpenAPI and conceptual persistence; resolve provider/deletion limitations or explicitly approve their degraded/demo scope.

## Gate C — implementation authorization (NOT approved)

Only after Gate B explicit sign-off: scaffold Angular/Spring Boot, author reviewed Flyway migrations, configure Supabase and service secrets, set up Render/Vercel deployment and acceptance tests. **No application code or deployment is part of Gate A.**

## Semantic safety checks

AI processing consent checked before every outbound call; personalization checked separately and journal flags respected; no WANT_TO_READ ReadingExperience; no concurrent open readings; one private/manual work identity; exact-owner library membership; source contributor role; no destructive library cascades; endpoint pagination parity; no active memory reactivation; offers use immutable observedAt; no inferred acquisition. Unknown academic/provider facts remain labelled **BLOCKED**.
