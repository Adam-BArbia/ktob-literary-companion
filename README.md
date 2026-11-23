# KTOB — Keep Thoughts On Books

**Read. Reflect. Discover.**

KTOB is a private literary companion centered on personal reading libraries, journal reflections, carefully controlled AI advice, and sourced book acquisition history.

## Current state — hosted Sprint 1 foundation (2026-11-23)

The Java 21 / Spring Boot 4.1.3 backend in [`apps/api`](apps/api/README.md) and Angular 22 + Tailwind 4 frontend in [`apps/web`](apps/web/README.md) are hosted. Sprint 1 implements JWT-secured reader profiles, catalog search/manual entries, and private library list/add/archive/restore workflows. The frontend includes dedicated sign-in and sign-up screens connected to Supabase Auth. **User-approved R1 product defaults** remain defined in [OpenAPI v0.3](docs/architecture/openapi.json); the complete R1 scope is not yet implemented.

| Component | Hosted address | Verified state on 23 November 2026 |
| --- | --- | --- |
| Web application | [ktob-web-front.vercel.app](https://ktob-web-front.vercel.app) | Vercel production deployment ready; runtime configuration points to the KTOB API and Auth project |
| Java API | [ktob-api.onrender.com/api/v1/health](https://ktob-api.onrender.com/api/v1/health) | Render deployment live; health returns HTTP 200 |
| Auth and PostgreSQL | KTOB project `afavrsrffoyctyvvpxcv` | Healthy; email signup enabled with confirmation required; five business tables exist in private `app` schema |

Public smoke checks verify frontend routes/configuration, the Auth signing keys, API liveness, anonymous-request rejection and production-origin CORS. They **do not** verify successful confirmation-email delivery or an authenticated reader's complete production database workflow. See [Sprint 1 validation and limitations](docs/implementation/15-sprint1-progress.md).

**Start here:** [Implementation handoff](docs/implementation/README.md) → [Sprint backlog](docs/implementation/10-sprint-backlog.md) → [First implementation checklist](docs/implementation/12-start-implementation-checklist.md).

### Architecture

- **Frontend:** Angular 22, TypeScript, Tailwind CSS → Vercel.
- **Backend:** Java 21 / Spring Boot 4.1.x, one modular deployable → Render.
- **Identity and persistence:** Supabase Auth + PostgreSQL in private `app` schema, Java-only business APIs.
- **External free web service for SOA project:** Open Library book metadata via Java; manual private fallback if unavailable.
- **API contract:** [35 paths / 57 operations](docs/architecture/openapi.json); [all-operation implementation coverage](docs/implementation/13-api-coverage.md).
- **Modelling:** [16 editable PlantUML diagrams](docs/uml/README.md); [architecture decisions and persistence](docs/architecture/README.md).

The [Sprint 0 foundation](docs/implementation/14-sprint0-foundation.md) adds RFC 9457 error handling, typed pagination/UUID helpers, secret-safe configuration templates and route synchronization. **11 of the 57 contract operations are implemented**, as recorded in [the operation registry](docs/implementation/implemented-operations.json). Journals, AI conversations, collections, acquisition history and the remaining R1 operations are future work; unavailable features must remain clearly identified in the interface.

### Allowed implementation boundary

The documented first-party core (M0–M3) is **ready to implement locally**. Implementing disabled adapter contracts and their truthful UI states is also allowed. **Do not enable unapproved AI vendor traffic, advertise unverified live bookstore prices, or expose full-account deletion.** The B13/B15/B16 decisions remain tracked in [the risk register](docs/implementation/11-risk-and-decision-register.md).

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
