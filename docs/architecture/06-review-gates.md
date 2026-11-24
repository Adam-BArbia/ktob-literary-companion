# KTOB — Engineering readiness and release gates

## Current scoped authorization — 24 November 2026

**V3 execution is authorized.** The owner explicitly approved the star repair, V2 hardening, real Groq literary chat, consent/spoiler controls, safe tests, reviewed additive migrations, CI-verified PR merges, and deployment to the existing KTOB services. Routine work in this scope does not need repeated confirmation. Mandatory tool review and production migration safety checks still apply; paid services, secret disclosure and destructive data changes are not authorized.

The baseline reading-journal release is deployed. Its evidence is in [V2](../implementation/overnight-release-demo.md); new source, tests, migration, authenticated acceptance and live-provider outcomes are tracked in [V3](../implementation/v3-release-demo.md). Documentation CI alone is not a release certificate.

## Independent feature gates

**B13 and B15 remain CLOSED:**

- **B13** full account deletion: no DELETE /me route or complete-erasure claim until recent reauthentication, retention, backup and provider policies are approved.
- **B15** verified live seller search: no invented merchant/price data or functioning-provider claim without a validated source. Historical USER_SUPPLIED offers remain a separate planned feature.
- **B16** Groq qualification: the owner selected GPT-OSS120B, created an account/key, confirmed model visibility and reported Global ZDR enabled. Before production dispatch, confirm appropriate account/model access, free quota, data controls and application consent/privacy checks. The adapter requires both server-only `GROQ_API_KEY` and operator-controlled `KTOB_GROQ_QUALIFIED=true`; qualification defaults false. The owner is not required to add `AI_ENABLED`. Record actual non-sensitive inference and deployment evidence before calling the integration operational.

**Current B16 evidence:** a qualified Render deployment is LIVE, safe startup booleans confirm credential presence/qualification, and actual preview English/French/Arabic replies persisted after reload. Selected-book context, full-spoiler validation/reset/disclosure, the observed no-spoiler follow-up and saved consent revocation passed. Frontend PR #8 merged after CI; production is READY with a real French book reply and reload/revocation checks passed. The final Render cleanup deployment is LIVE; health, anonymous rejection and exact production-origin CORS passed, while the removed preview and unrelated origins were rejected. See the [V3 record](../implementation/v3-release-demo.md); these successful test turns do not establish factual accuracy, unlimited capacity or a spoiler guarantee.

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
- [x] Final V3 backend/frontend tests and independent review recorded (66 Java and 125 Angular tests; production/live acceptance remains separate).
- [x] V3 disposable migration/grant tests, production preflight and postchecks recorded; production migration `20261124000453` verified with existing data unchanged.
- [x] Star fix and authenticated persistence accepted, with responsive-browser/device limitations recorded.
- [ ] Live two-reader acceptance (automated owner-isolation tests passed; live two-account testing was unavailable).
- [x] Real Groq model, three sanitized adapter latency/quota samples and English/French/Arabic preview checks recorded; no capacity or accuracy guarantee inferred.
- [x] CI-verified PR #8 merge and production Vercel deployment recorded; authenticated production acceptance passed.
- [x] Final preview-origin cleanup Render LIVE state and HTTP/CORS postchecks recorded; production allowed, removed preview and unrelated origins rejected, automatic migration still disabled.

Update these checkboxes only from observed results. A provider mock, successful build, owner account-control statement or liveness response alone does not prove live inference or authenticated production correctness.

## Change control

If implementation finds a contradictory invariant, update OpenAPI, affected UML, architecture and handoff together, then run contract checks. Preserve rating/progress/spoiler semantics and non-destructive archive. The [historical Gate B decision review](08-gate-b-decision-review.md) remains the product-decision record; current scoped authority and current deployment evidence are separated here.
