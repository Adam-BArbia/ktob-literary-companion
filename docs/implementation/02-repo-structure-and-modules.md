# Proposed repository and module boundaries

The existing repository is documentation-only. The following paths are **targets to create during implementation**, not files already committed.

```text
ktob-literary-companion/
├── apps/
│   ├── api/                         # Java 21 / Spring Boot 4.1.x Maven application
│   │   ├── .mvn/                    # Maven wrapper bootstrap files
│   │   ├── mvnw, mvnw.cmd, pom.xml
│   │   └── src/
│   │       ├── main/java/.../ktob/
│   │       │   ├── KtobApplication.java
│   │       │   ├── api/              # REST controllers, DTOs, validation/error advice
│   │       │   ├── security/         # JWT verification, owner context, CORS
│   │       │   ├── reader/           # profile, preferences, boundaries and consent
│   │       │   ├── library/          # entries, readings, journal, collections
│   │       │   ├── catalog/          # works, editions, contributors and provenance
│   │       │   ├── advisor/          # recommendations, messages, memory
│   │       │   ├── acquisition/      # saved observations and access records
│   │       │   ├── export/           # five-set reader-owned essentials export
│   │       │   ├── integration/      # ports/adapters: Open Library, AI, seller
│   │       │   └── shared/           # pagination, error, value objects
│   │       ├── main/resources/
│   │       │   ├── application.yml
│   │       │   └── db/migration/     # Versioned Flyway scripts CREATED IN M1/M2
│   │       └── test/               # unit/integration/web/security/contract tests
│   └── web/                         # Angular 22 standalone-API application
│       ├── package.json, package-lock.json, angular.json
│       └── src/app/
│           ├── core/               # authentication/session/interceptors/api gateway
│           ├── shared/             # UI primitives, validation, states, formatting
│           └── features/           # library, catalog, readings, journal, advisor, etc.
├── docs/
│   ├── uml/                         # 16 authoritative PlantUML diagrams
│   ├── architecture/                # OpenAPI, decisions, conceptual schema
│   └── implementation/             # this implementation handoff
├── .github/workflows/              # CI
└── README.md
```

## Module boundaries and ports

| Module | Owns | May call through exported interfaces |
|---|---|---|
| `api` | HTTP routing, OpenAPI DTO mapping, validation, errors | All application use cases; does not execute SQL |
| `security` | Spring Resource Server JWT, verified `readerId` scope, guards | Supabase Auth issuer/JWKS (configuration-dependent) |
| `reader` | profile, privacy flags, content boundaries, preferences | Shared values and own repository |
| `catalog` | catalog works, editions, contributors, private manual fallback | `BookMetadataPort` implemented by OpenLibrary adapter |
| `library` | entry/archive/restore, read experience, journal, collections | Catalog's work/edition read interface, reader identity |
| `advisor` | conversations, recommendation requests/items, proposals/memory decisions | Reader consent/boundary read interfaces, permitted library read projections, catalog lookup, `LiteraryAiPort` |
| `acquisition` | observed offers, source URL, access records | Catalog read interface; optional `BookOfferPort` |
| `export` | exactly five sets of records, versioned JSON shape | Owner-scoped read interfaces of reader/library; never cross-module table access |
| `integration` | outbound clients and response normalization | External providers only; no private journal persistence |
| `shared` | UUID/time/money/error values | None of domain modules |

### Naming the dependency issue explicitly

Earlier package UML shows `export` using reader/library/advisor read interfaces. Implement the **five-array export only**; advisor contributes explicit reading preferences when those are owned by that module. Avoid a circular dependency: either place preferences under `reader` and have export read them there, **or** have export call an advisor read-only interface without advisor depending on export. Choose and document one before implementing that module. **No module may import its own downstream caller.**

## Java architecture per module

Use the layering `api DTO/controller → application service → domain model → repository adapter`; integration adapters implement ports; cross-module calls through public use-case/read interfaces. Validate in services (not only controllers), enforce authorization before existence-sensitive operations, and never expose JPA entities directly as HTTP responses. Use transaction boundaries on use cases, not HTTP controllers. Use explicit DTO mapping (MapStruct only if version compatible; simple manual mappers are fine).

Suggested build dependencies, subject to actual Spring Boot 4.1 starter verification: Web MVC, Validation, Security resource server, Data JPA, PostgreSQL JDBC, Flyway + Postgres database module, Actuator for safe health and OpenAPI documentation. Prefer Spring Boot dependency management BOM; pin the Spring Boot parent version in `pom.xml`. Do not use speculative starter names from older releases without generating/compiling a project.

## Angular architecture

Angular standalone components; feature-scoped routes/lazy loading; typed services derive from OpenAPI response envelopes; HttpClient interceptor injects access token and handles 401 refresh/signout; route guards enforce signed-in UI only (backend is always authoritative). Signals or RxJS as suitable, not a second state framework by default. Tailwind and accessible, responsive components; forms and validation mirror API DTOs. Feature UI must not access `app` tables via Supabase Data API.

## Naming tests, ownership and design limits

One Spring Boot runtime / one PostgreSQL database, not a fabricated network of separately deployed services. The SOA demonstration relies on an independently accessible Java REST service and the free Open Library integration. Providers remain replaceable. The exact Java package groupId and Angular application name are naming choices for Sprint 0; pick consistent values once, then avoid API DTO drift.
