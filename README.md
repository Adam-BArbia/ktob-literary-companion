# KTOB — Keep Thoughts On Books

**Read. Reflect. Discover.**

KTOB is a private literary companion for personal reading libraries, reading experiences, journal reflections, and optional AI discussion.

## Current state — V3 deployed (24 November 2026)

The Java 21 / Spring Boot 4.1.3 backend in [`apps/api`](apps/api/README.md) and Angular 22 + Tailwind 4 frontend in [`apps/web`](apps/web/README.md) are hosted. Readers can sign in with Supabase Auth, discover or manually add books, manage a private library, record reading/rereading, save half-star ratings and private journal entries, and view their reading diary. The star rendering repair has passed production browser checks.

V3 adds general and book-specific conversations through Groq, with explicitly saved AI-processing consent and per-question spoiler controls. The frontend, backend and additive migration are deployed. English/French/Arabic replies and saved history passed preview acceptance, followed by a real French response, reload persistence and consent revocation in production. The temporary preview origin has been removed, and final health, authentication and CORS checks passed. **User-approved R1 product defaults** remain defined in [OpenAPI v0.3](docs/architecture/openapi.json); the complete R1 scope is not yet implemented.

| Component | Hosted address | Verified state on 24 November 2026 |
| --- | --- | --- |
| Web application | [ktob-web-front.vercel.app](https://ktob-web-front.vercel.app) | V3 production deployment READY at `b52e291`; library/journal/rating, conversation persistence and consent behavior accepted |
| Java API | [ktob-api.onrender.com/api/v1/health](https://ktob-api.onrender.com/api/v1/health) | Final V3 Render deployment LIVE at `b52e291`; real Groq replies verified, health 200, anonymous conversations 401, production CORS allowed and temporary preview access removed |
| Auth and PostgreSQL | KTOB project `afavrsrffoyctyvvpxcv` | Reviewed additive V3 migration applied; existing application data unchanged by migration checks; browser roles have no private-table access |

The [V3 release and demonstration record](docs/implementation/v3-release-demo.md) separates local tests, GitHub checks, production V2 workflows, real provider acceptance and deployment evidence. Live two-account isolation and mobile-touch/device testing remain unexecuted; automated reader-isolation tests and responsive browser-width checks are distinct evidence. AI responses can be mistaken; provided passages are preferable for precise close reading, and facts or quotations need verification.

**Start here:** [V3 release/demo](docs/implementation/v3-release-demo.md) → [Implementation guide](docs/implementation/README.md) → [API coverage](docs/implementation/13-api-coverage.md). The [free AI API comparison](docs/implementation/free-ai-api-options.md) explains current no-card/free options and their privacy limits.

### Architecture

- **Frontend:** Angular 22, TypeScript, Tailwind CSS → Vercel.
- **Backend:** Java 21 / Spring Boot 4.1.x, one modular deployable → Render.
- **Identity and persistence:** Supabase Auth + PostgreSQL in private `app` schema, Java-only business APIs.
- **External free web service for SOA project:** Open Library book metadata via Java; manual private fallback if unavailable.
- **Optional AI:** Java calls Groq only after current reader consent. V3 uses the question, minimal selected-book metadata and bounded eligible conversation history; stored journal/history/profile/memory context is excluded.
- **API contract:** [35 paths / 57 operations](docs/architecture/openapi.json); [all-operation implementation coverage](docs/implementation/13-api-coverage.md).
- **Modelling:** [16 editable PlantUML diagrams](docs/uml/README.md); [architecture decisions and persistence](docs/architecture/README.md).

The [Sprint 0 foundation](docs/implementation/14-sprint0-foundation.md) adds RFC 9457 error handling, typed pagination/UUID helpers, secret-safe configuration templates and route synchronization. **26 of the 57 contract operations are implemented**, as recorded in [the operation registry](docs/implementation/implemented-operations.json). Collections, recommendations, approved memory, acquisition/offer history, export and remaining R1 operations are future work. Verified live seller research and complete account deletion remain unavailable.

### Scope and release controls

The owner authorized the scoped V3 implementation, reviewed additive migration, CI-verified merges and deployment to the existing services. This does not authorize destructive data changes or paid/unreviewed provider fallback. Groq qualification is separate from each reader's consent. Sign-out/account changes clear private page state; the Java API independently enforces verified-reader ownership. The B13/B15/B16 decisions and actual limitations remain tracked in [the risk register](docs/implementation/11-risk-and-decision-register.md).

The university requirements previously shared permit a Java **REST or SOAP** service, a frontend consuming the team's Java service, and Java consuming a free online service; the full official rubric/deadline is still unverified.

## Local update (Windows CMD)

```bat
cd /d C:\dev\ktob-literary-companion
git pull origin main
where java
java -version
```

**Java must resolve to JDK 21**, not the Oracle Java 8 path previously taking precedence. See [Windows setup and deployment](docs/implementation/08-local-dev-ci-deploy.md) before running the application locally.

GitHub Actions validate UML/contracts, compile/test Java, test/build Angular from a committed npm lockfile, and run [integrated foundation CI](.github/workflows/foundation-ci.yml) with Flyway and reader-isolation tests against disposable PostgreSQL. [Production public smoke checks](.github/workflows/production-smoke.yml) cover the hosted integration separately. CI database tests must never target the hosted KTOB database.
