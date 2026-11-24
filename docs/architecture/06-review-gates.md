# KTOB — Engineering readiness and release gates

## Current scoped authorization — 24 November 2026

**V3 execution is authorized.** The owner explicitly approved the star repair, V2 hardening, real Groq literary chat, consent/spoiler controls, safe tests, reviewed additive migrations, CI-verified PR merges, and deployment to the existing KTOB services. Routine work in this scope does not need repeated confirmation. Mandatory tool review and production migration safety checks still apply; paid services, secret disclosure and destructive data changes are not authorized.

The baseline reading-journal release is deployed. Its evidence is in [V2](../implementation/overnight-release-demo.md); new source, tests, migration, authenticated acceptance and live-provider outcomes are tracked in [V3](../implementation/v3-release-demo.md). Documentation CI alone is not a release certificate.

## Independent feature gates

**B13 and B15 remain CLOSED:**

- **B13** full account deletion: no DELETE /me route or complete-erasure claim until recent reauthentication, retention, backup and provider policies are approved.
- **B15** verified live seller search: no invented merchant/price data or functioning-provider claim without a validated source. Historical USER_SUPPLIED offers remain a separate planned feature.
- **B16** Groq qualification: the owner selected GPT-OSS120B, created an account/key, confirmed model visibility and reported Global ZDR enabled. Before production dispatch, confirm appropriate account/model access, free quota, data controls and application consent/privacy checks. The adapter requires both server-only `GROQ_API_KEY` and operator-controlled `KTOB_GROQ_QUALIFIED=true`; qualification defaults false. The owner is not required to add `AI_ENABLED`. Record actual non-sensitive inference and deployment evidence before calling the integration operational.

A generic AI prompt still needs current processing consent. V3 sends no stored personalization and preserves per-request spoiler acknowledgement. Recommendations, memories and complete reader deletion are outside the scoped V3 release.

## Historical handoff and current evidence

On 2026-11-20 the reader requested the documents needed to begin implementation, after approving R1 defaults B01–B12 and B14. That decision made the first-party core **ready for local Sprint 0**; it did not itself apply a migration or deploy code.

- **Gate A documentation:** 16 named UML files, 35-path/57-operation OpenAPI v0.3, conceptual persistence and consistency checks formed the baseline.
- **Gate B core architecture:** M0–M3 first-party features were implementation-ready, with tests and deployment evidence required during coding. REST/JSON follows the user-shared “SOAP ou REST” assignment; the full faculty rubric remains unverified.
- **Gate C execution:** the subsequent V2 and V3 owner authorizations permit the scoped engineering and releases. Historical proposal labels do not revoke those instructions or establish untested feature completion.

## Release evidence checklist

- [x] Reader-approved R1 defaults and explicit scoped V3 authorization recorded.
- [x] Actual Java/Angular applications and CI exist; V2 production migration and deployments are recorded.
- [x] V3 preserves the existing 57-operation inventory and uses six existing privacy/conversation operations.
- [x] Final V3 backend/frontend tests and independent review recorded (66 Java and 111 Angular tests; production/live acceptance remains separate).
- [ ] V3 disposable migration/grant tests, production preflight and postchecks recorded.
- [ ] Star fix, authenticated persistence and two-reader acceptance recorded with precise limitations.
- [ ] Real Groq model/latency/quota and English/French/Arabic checks recorded.
- [ ] Final CI-verified merge and existing-service deployment IDs recorded.

Update these checkboxes only from observed results. A provider mock, successful build, owner account-control statement or liveness response alone does not prove live inference or authenticated production correctness.

## Change control

If implementation finds a contradictory invariant, update OpenAPI, affected UML, architecture and handoff together, then run contract checks. Preserve rating/progress/spoiler semantics and non-destructive archive. The [historical Gate B decision review](08-gate-b-decision-review.md) remains the product-decision record; current scoped authority and current deployment evidence are separated here.
