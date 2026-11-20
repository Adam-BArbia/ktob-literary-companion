# KTOB — Engineering handoff gates (2026-11-20)

## Scope of this readiness decision

On 2026-11-20 the reader requested **all documents needed to begin implementation**. Previously they approved R1 product defaults B01–B12 and B14. The [implementation handoff](../implementation/README.md) is now the actionable baseline for initial engineering work, not a production release certificate.

**Gate A documentation:** 16 named UML files, 35-path/57-operation OpenAPI v0.3, conceptual persistence and cross-document consistency tests completed.

**Gate B core architecture:** implementation-ready **for M0–M3 / first-party features**, subject to actual test and security verification during coding. The accepted protocol direction is REST/JSON based on the user-shared “SOAP ou REST” assignment; full faculty rubric/deadline not independently reviewed. This is **not** sign-off that provider-dependent full Complete Core Experience is working.

**Gate C implementation execution:** **ready for local Sprint 0; no application code has yet been created.** Building Java/Angular scaffold, local DB migrations, Open Library adapter, authenticated library, reading, journal, privacy, copies history and essentials export may proceed when coding begins. This documentation request itself did **not** run migrations or deploy anything.

**Independent feature gates remain CLOSED:**

- **B13** full account deletion: no DELETE /me route, no UI claim of complete erasure until recent reauth/retention/backup/provider policies are approved.
- **B15** verified live seller search: return explicit unavailable state, allow labelled USER_SUPPLIED historical saved offers; do not fabricate merchant/price.
- **B16** AI provider: implement port plus disabled/fail-closed behavior, no live external AI calls until vendor/model access, data retention, privacy and quotas approved.

## Evidence checklist

- [x] Reader approved R1 product defaults B01–B12/B14.
- [x] Java REST + Angular + Open Library meets the previously user-reported protocol and external-service direction.
- [x] 16 diagrams, API v0.3, conceptual data model, user privacy and spoofing/IDOR safeguards documented.
- [x] Implementation handoff covering repository structure, migration blueprint, frontend routes, integration ports, security, tests, deployment, backlog and all 57 API operations.
- [ ] Actual application scaffold and build CI (Sprint 0).
- [ ] Nonproduction PostgreSQL migrations reviewed and tested (Sprint 1).
- [ ] Independent Java↔Open Library call + Angular→Java path demonstrated (Sprint 1).
- [ ] User-facing and security acceptance tests, provider failure cases, cold-start/deployment verification (later).
- [ ] Complete official academic rubric, any additional deliverables and final validation date.
- [ ] B13/B15/B16 external decisions separately approved for respective functionality.

## Change control

If implementation discovers a contradictory invariant, update OpenAPI, affected UML, architecture and handoff and run the contract suite in one PR. Do not silently change rating/progress/spoiler policy or reinterpret a soft archive as deletion. A green documentation CI does **not** prove application tests or security in production.

The prior detailed [Gate B product approval register](08-gate-b-decision-review.md) remains historical evidence. This handoff allows work to **start**; it does not declare the project **finished**.
