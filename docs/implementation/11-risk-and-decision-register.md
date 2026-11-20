# Open risks, external dependencies and deferred commitments

**Date:** 2026-11-20. This file makes the project implementable without **pretending** the remaining dependencies were approved.

| Ref | Decision / risk | Decision at implementation handoff | Reopen when |
|---|---|---|---|
| B13 | Complete reader deletion, session revocation, backup/AI retention | **BLOCKED** — no DELETE /me endpoint or “erase account” UI. R1 essentials export is not full portability or erasure. | Detailed approved data inventory, reauth, purge/backup policies and provider retention |
| B15 | Verified live Tunisia-first bookstore seller research | **BLOCKED** — empty/unavailable verified-offer API, user-supplied saved history only. No fake source or scraped listing. | Legal/source terms, freshness/provenance, currency, Tunisian coverage and failure tests |
| B16 | AI model/provider and free quota | **BLOCKED** — write deny-by-default adapter and UI states; no real call until provider validated. | Legal/privacy retention, quota, access, multilingual and latency evidence |
| RUBRIC | Exact faculty grading instructions/deadline | REST is permissible according to prior user-shared “SOAP ou REST”; full written rubric not verified. | Instructor's actual file or confirmation |
| OPS | Render Free sleep/limits, Supabase quotas, cold start | Test and measure; do not promise uptime/performance or high concurrency | Staging deployment and observed metrics |
| SEC | JWT signing mode and migration DB permissions | Configure with actual Supabase project; do not assume JWKS/role semantics | Sprint 1 setup and secrets available |
| API | App endpoints 57 operations | Freeze current v0.3 before Sprint 0; changes only via contract PR | Verified failure in implementation or explicit user-approved scope change |
| DATA | Backup/restore/retention for reader material | Define and test before production; no user-facing deletion promise | Production staging/prelaunch |
| UX | AI no-spoiler guarantee | Best-effort only with clear acknowledgement; full spoilers one request, not sticky | Provider tests and UX review |

## Scope policy and its consequences

**Allowed to start immediately:** Java/Angular scaffolding, JWT and private DB design with disposable migrations, Open Library service consumption, library/reading/journal/collections/privacy/saved history/export, tests and degraded-adapter placeholders. These are first-party/core and can be independently validated.

**Not allowed to claim completed:** real AI chat/recommendations if no model, verified live seller prices, full deletion/complete archive. Their **design contracts** are preserved and their implementations are behind feature gates.

**When we call M1 finished:** the professor's 3 core SOA conditions can be demonstrated with actual services. When we call *Complete Core Experience* finished: all promised consumer-facing features must either be operational after provider review, or the user must explicitly approve a narrower public release. Do not silently reduce marketing claims.

## Decision log rules

Do not infer consent, legal approval or external vendor availability from this document. Add decision ID, evidence link, reviewer, date and changed files when resolving B13/B15/B16. In product UI, blocked features should be labelled unavailable and never silently connected to test/mock providers.
