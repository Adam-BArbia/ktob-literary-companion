# KTOB review gates after consistency remediation

## Gate A — documentation remediation

All 16 UML sources are preserved with the original filenames. OpenAPI includes 57 deliberate R1 operations (55 originally audited + collection-member GET + library restore POST), with corrected DTOs, reading states, recommendation batch, offer metadata and consent controls. Cross-document matrix is at [07-consistency-matrix.md](07-consistency-matrix.md). **Technical validation is necessary but does not grant product approval.**

## Gate B — human architecture review (NOT yet approved)

- [ ] Obtain professor's exact SOAP/REST/WSDL/service-registry/separate-deployment rubric (**BLOCKED**).
- [ ] Approve one Spring Boot modular deployable versus required physical services.
- [ ] Approve canonical work global/private visibility and handling of near-duplicate catalog works.
- [ ] Approve shelf projection, historical imports, single-open reading and terminal states.
- [ ] Approve non-destructive library archive/restore and what appears in collection lists and R1 exports.
- [ ] Decide rating scale, progress format, profile fields, scope of manual entry and any spoilers.
- [ ] Approve processing consent UX, personalization scopes, journal exclusions, AI provider contract/retention (**BLOCKED provider**).
- [ ] Approve uncertain content-warning behavior and explicit request-scoped exceptions.
- [ ] Select and independently verify a seller-research source/coverage/legal use (**BLOCKED**).
- [ ] Approve memory proposal traceability and terminal revocation.
- [ ] Approve R1 JSON essentials export and describe missing categories; decide future full archive.
- [ ] Approve full account deletion: recent reauth, revocation, retention, third-party data (**BLOCKED**).
- [ ] Review idempotency key retention and request-body replay behavior.
- [ ] Run PlantUML parser/render checks and maintained OpenAPI validation in CI (see workflow), plus semantic parity checks.
- [ ] Confirm no orphaned foreign keys/cross-reader collection/memory references.
- [ ] Sign off that diagrams, API and conceptual persistence represent the same product rules.

## Gate C — implementation authorization (NOT approved)

Only after Gate B explicit sign-off: scaffold Angular/Spring Boot, author reviewed Flyway migrations, configure Supabase and service secrets, set up Render/Vercel deployment and acceptance tests. **No application code or deployment is part of Gate A.**

## Semantic safety checks

AI processing consent checked before every outbound call; personalization checked separately and journal flags respected; no WANT_TO_READ ReadingExperience; no concurrent open readings; one private/manual work identity; exact-owner library membership; source contributor role; no destructive library cascades; endpoint pagination parity; no active memory reactivation; offers use immutable observedAt; no inferred acquisition. Unknown academic/provider facts remain labelled **BLOCKED**.
