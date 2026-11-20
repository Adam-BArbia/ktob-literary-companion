# Implementation backlog (ordered, PR-sized)

This is the **execution sequence**. Do not build seven modules in parallel before the first end-to-end path works. Each task ends with a test and a visible deliverable. Use GitHub Issues/Jira if the team wants tracking; this document is the canonical ordering until a tracker is configured.

## Sprint 0 — foundation (first coding session)

| ID | Task | Acceptance |
|---|---|---|
| KTOB-001 | Create `apps/api` Java 21 / Spring Boot 4.1.x Maven wrapper project | `mvnw.cmd test` passes; GET `/api/v1/health` returns `{"status":"ok"}` |
| KTOB-002 | Create `apps/web` Angular 22 standalone app + Tailwind | `npm ci`, test and production build pass |
| KTOB-003 | Add workspace root README, environment templates, ignore rules | No secrets; Windows setup documented |
| KTOB-004 | Add code CI with Java/Node builds and disposable test Postgres | PRs fail on broken builds, no production credentials |
| KTOB-005 | Define `ProblemDetail`, pagination, API envelope and UUID validation | One controller integration test for happy/error paths |
| KTOB-006 | Establish OpenAPI/DTO synchronization policy | OpenAPI contract remains 35 paths/57 operations unless change reviewed |

**Stop point:** Both apps compile separately; backend health accessible; no database/provider integration yet. Confirm before M1.

## Sprint 1 — actual SOA demonstration slice

| ID | Task | Acceptance |
|---|---|---|
| KTOB-101 | Configure Supabase Auth client in Angular, verify real JWT in Spring Boot | Anonymous/expired/wrong-project rejected; signed-in reader identified |
| KTOB-102 | Create private schema + reader/catalog/library migrations on disposable database | Migrations idempotently replay from clean DB; no public business access |
| KTOB-103 | Implement profile auto-provision and privacy defaults | Reader profile appears, all consent flags off |
| KTOB-104 | Implement Open Library adapter with quota-aware cache and HTTP stub tests | Java makes identifiable external search call; 429/timeouts handled |
| KTOB-105 | Expose catalog search + private manual work + library create/read | Browser → Java → provider; manual fallback; owner-only reads |
| KTOB-106 | Build Angular catalog search and personal library screen | Successful end-to-end demo plus no-results/offline state |
| KTOB-107 | Record SOA evidence for evaluation | Independent Java API, Angular consumption, external free service consumption |

**Stop point:** A real book can be found through Java and placed into an authenticated reader's private library from Angular. This is the minimum academic vertical slice, not the final project.

## Sprint 2 — reading, notes and collections

KTOB-201: library PATCH/archive/restore, work and preferred edition guards; KTOB-202: reading experiences (reread/one-open/historical import); KTOB-203: per-experience ratings and progressPercent; KTOB-204: journal CRUD/per-note AI exclusion; KTOB-205: collection CRUD, owner-safe membership and pagination; KTOB-206: responsive book, journal, history and collection UI; KTOB-207: all archive/restore/IDOR tests.

## Sprint 3 — private reader controls, acquisition, export

KTOB-301: preferences/boundaries/privacy CRUD; KTOB-302: saved historical offers and acquisition records, immutable timestamps, paired currency; KTOB-303: provider-unavailable offer GET with real metadata and currency validation (no fake listings); KTOB-304: JSON five-category essentials export; KTOB-305: settings, copies and export UI; KTOB-306: privacy/access audit tests and remaining error branches.

## Sprint 4 — optional AI adapter, consent and memory features (provider gate applies)

KTOB-401: define LiteraryAiPort + disabled adapter returning 503; KTOB-402: processing and personalization consent gates; KTOB-403: request-level spoiler/no-spoiler policy and context redaction; KTOB-404: conversation turns and provider failure atomicity; KTOB-405: recommendations/firm boundaries/provenance; KTOB-406: memory proposal/approval/revoke; KTOB-407: provider qualification record. **Do not enable live AI until B16 independently approved.** No mock AI presented as live.

## Sprint 5 — operations and release/demo

KTOB-501: render/free-resource profiling, safe health check, cold start UX; KTOB-502: Vercel/Render nonproduction deployment with CORS/TLS; KTOB-503: production migration review and owner security test; KTOB-504: end-to-end user demo script and grading evidence; KTOB-505: accessible/mobile-responsive UI sweep; KTOB-506: final documentation of unavailable integrations.

## Explicitly separate issues

- KTOB-B13: account deletion and complete personal-data export policy, reauthentication and third-party retention — **BLOCKED**.
- KTOB-B15: verified seller lookup provider with legal Tunisian availability, tests and rate limits — **BLOCKED**.
- KTOB-B16: select AI vendor/model and validate free access, language, quotas and privacy terms — **BLOCKED**.
- KTOB-RUBRIC: obtain the complete professor assignment and confirmed validation date — **UNVERIFIED**.

## Small-PR discipline

Every PR includes affected task ID, changed operations/DTOs, migration impact, reproducible commands, tests and screenshot/network trace when UI/SOA behavior changes. Do not implement independent microservices, book-price scrapers, full deletion UI, or broad AI inference until explicitly approved.
