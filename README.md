# KTOB — Keep Thoughts On Books

**Read. Reflect. Discover.**

KTOB is a private literary companion centered on personal reading libraries, journal reflections, carefully controlled AI advice, and sourced book acquisition history.

## Current state — implementation handoff ready (2026-11-20)

**KTOB-001 is implemented:** a Java 21 / Spring Boot 4.1.3 backend with Maven Wrapper and a public `GET /api/v1/health` endpoint lives in [`apps/api`](apps/api/README.md). **KTOB-002 is implemented:** Angular 22 + Tailwind 4 responsive web shell and real Java health integration at [`apps/web`](apps/web/README.md). Business modules, Supabase integration and production deployment remain future work. **User-approved R1 product defaults** have been frozen in [OpenAPI v0.3](docs/architecture/openapi.json).

**Start here:** [Implementation handoff](docs/implementation/README.md) → [Sprint backlog](docs/implementation/10-sprint-backlog.md) → [First implementation checklist](docs/implementation/12-start-implementation-checklist.md).

### Architecture

- **Frontend:** Angular 22, TypeScript, Tailwind CSS → Vercel (planned).
- **Backend:** Java 21 / Spring Boot 4.1.x, one modular deployable → Render (planned).
- **Identity and persistence:** Supabase Auth + PostgreSQL in private `app` schema, Java-only business APIs.
- **External free web service for SOA project:** Open Library book metadata via Java; manual private fallback if unavailable.
- **API contract:** [35 paths / 57 operations](docs/architecture/openapi.json); [all-operation implementation coverage](docs/implementation/13-api-coverage.md).
- **Modelling:** [16 editable PlantUML diagrams](docs/uml/README.md); [architecture decisions and persistence](docs/architecture/README.md).

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

**Java must resolve to JDK 21**, not the Oracle Java 8 path previously taking precedence. See [Windows setup and deployment](docs/implementation/08-local-dev-ci-deploy.md) before generating the application.

GitHub Actions validate UML/contracts, compile/test the Java backend, and test/build Angular from a committed npm lockfile. No application database migration or deployment has been performed.
