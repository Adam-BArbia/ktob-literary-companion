# Open risks, external dependencies and deferred commitments

**Updated:** 24 November 2026. The owner authorized scoped V3 execution and selected Groq. This register distinguishes that authorization and owner-provided controls from tested provider/deployment evidence.

| Ref | Decision / risk | Decision at implementation handoff | Reopen when |
|---|---|---|---|
| B13 | Complete reader deletion, session revocation, backup/AI retention | **BLOCKED** — no DELETE /me endpoint or “erase account” UI. R1 essentials export is not full portability or erasure. | Detailed approved data inventory, reauth, purge/backup policies and provider retention |
| B15 | Verified live Tunisia-first bookstore seller research | **BLOCKED** — empty/unavailable verified-offer API, user-supplied saved history only. No fake source or scraped listing. | Legal/source terms, freshness/provenance, currency, Tunisian coverage and failure tests |
| B16 | Groq model/provider and free quota | **VERIFIED FOR SCOPED V3** — qualified Render and production Vercel are deployed; seven real replies include EN/FR/AR preview checks and a production French book reply, with persistence/consent/spoiler acceptance recorded. Temporary preview access was removed and final CORS checks passed. Global ZDR remains owner-reported. No stored personalization. | Provider/model/policy or quota changes, new data scopes, and continued quality checks; one incidental plot detail was questionable, so no factual-accuracy or spoiler guarantee is made. Final deployment evidence is in [V3](v3-release-demo.md). |
| RUBRIC | Exact faculty grading instructions/deadline | REST is permissible according to prior user-shared “SOAP ou REST”; full written rubric not verified. | Instructor's actual file or confirmation |
| OPS | Render Free sleep/limits, Supabase quotas, cold start | Deployment and bounded live calls verified; individual timing samples do not establish uptime, throughput or high concurrency | Actual workload, cold-start behavior, provider limits or hosting changes |
| SEC | JWT signing mode and migration DB permissions | Verified JWT enforcement and reviewed restricted-role V1–V3 migrations; private browser-role denial tested | Signing-key rotation, role/schema changes or additional private operations |
| API | App endpoints 57 operations | Existing v0.3 inventory preserved; 26 implemented, 31 planned, tracked by registry and contract tests | Verified contract failure or explicit user-approved scope change |
| DATA | Backup/restore/retention for reader material | Additive migration preserved existing data; no tested full backup/restore or complete-erasure claim | Separate recovery drill and reviewed retention/deletion policy |
| UX | AI no-spoiler guarantee | Best-effort only with clear acknowledgement; full spoilers one request, not sticky | Provider tests and UX review |

## V3 decision record

**V3-20261124:** owner authorized star repair, V2 regression, six existing privacy/conversation operations, Groq integration, reviewed additive migration and CI-verified staged release. Initial AI context excludes all stored journal/history/profile/memory content. `GROQ_API_KEY` remains server-only; `KTOB_GROQ_QUALIFIED` defaults false and is managed by the authorized release operator. No manual `AI_ENABLED` variable is required. The agent review verifies source/SQL/contracts; actual provider and deployment outcomes are recorded separately in [V3](v3-release-demo.md). B13 and B15 remain BLOCKED.

**V3-QA-ORIGIN:** authenticated acceptance before frontend promotion may temporarily append one operator-verified KTOB Vercel deployment origin through `KTOB_QA_WEB_ORIGIN`. Strict origin syntax and domain checks prevent wildcard/multiple-origin expansion, but do not prove deployment ownership. The release operator verifies the exact deployment in the existing project and removes the temporary origin after acceptance; `ALLOWED_WEB_ORIGINS` is preserved.

## Scope policy and its consequences

**Allowed to start immediately:** Java/Angular scaffolding, JWT and private DB design with disposable migrations, Open Library service consumption, library/reading/journal/collections/privacy/saved history/export, tests and degraded-adapter placeholders. These are first-party/core and can be independently validated.

**Not allowed to claim completed:** real AI chat/recommendations if no model, verified live seller prices, full deletion/complete archive. Their **design contracts** are preserved and their implementations are behind feature gates.

**When we call M1 finished:** the professor's 3 core SOA conditions can be demonstrated with actual services. When we call *Complete Core Experience* finished: all promised consumer-facing features must either be operational after provider review, or the user must explicitly approve a narrower public release. Do not silently reduce marketing claims.

## Decision log rules

Do not infer consent, legal approval or external vendor availability from this document. Add decision ID, evidence link, reviewer, date and changed files when resolving B13/B15/B16. In product UI, blocked features should be labelled unavailable and never silently connected to test/mock providers.
