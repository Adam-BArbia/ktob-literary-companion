# KTOB Java API — Sprint 0 / KTOB-001

**Status:** Spring Boot health endpoint plus shared RFC 9457 errors, response envelopes, bounded pagination and UUID value parsing are implemented. No database, authentication, live AI or seller provider is connected. This backend is intentionally small and can run without secrets or a Supabase project.

## Toolchain

- Java **21** (not Java 8)
- Spring Boot **4.1.3**, Spring MVC web application
- Apache Maven **3.10.1** via the checked-in official Apache Maven Wrapper 3.3.4 scripts; system Maven installation is not required
- GroupId: `tn.ktob`; artifact: `ktob-api`
- Local development port: `8080` (override using `PORT` environment variable)

## Windows CMD — build and run

```bat
cd /d C:\dev\ktob-literary-companion
git pull origin main
cd apps\api
mvnw.cmd -version
mvnw.cmd -B -ntp clean verify
mvnw.cmd spring-boot:run
```

The first invocation downloads a Maven distribution/dependencies from Maven Central if necessary. Ensure `java -version` and `javac -version` both show **21**. If CMD finds Java 8, run `dir /b "C:\Program Files\Eclipse Adoptium"` and, if the `jdk-21...` folder is present, in that CMD session:

```bat
set "JAVA_HOME="
for /d %D in ("C:\Program Files\Eclipse Adoptium\jdk-21*") do @set "JAVA_HOME=%~fD"
set "PATH=%JAVA_HOME%\bin;%PATH%"
java -version
javac -version
where java
```

**This PATH adjustment is temporary for the open CMD window.** Do not run it blindly if `jdk-21...` was not found.

## API contract: health

```http
GET http://localhost:8080/api/v1/health
Accept: application/json
```

Expected HTTP 200 with `Content-Type: application/json`:

```json
{"status":"ok"}
```

Verify in another CMD window using:

```bat
curl.exe -i http://localhost:8080/api/v1/health
```

Browser: http://localhost:8080/api/v1/health . Stop the server with `Ctrl+C`.

The path and exact response shape are defined by `docs/architecture/openapi.json` (`GET /health` under the `/api/v1` server prefix). Other API operations are not yet available. No Supabase connections, database migrations, external AI keys or live seller source exist in this task.

## Tests and next steps

- `KtobApplicationTests.contextLoads` — Spring context bootstraps.
- `HealthControllerTest.livenessMatchesThePublishedOpenApiContract` — verifies HTTP 200, JSON response and expected status.
- `HealthControllerTest.livenessDoesNotDependOnAuthentication` — public endpoint remains reachable.
- `ApiPrimitivesTest` — pagination bounds, UUIDs and response value objects.
- `ApiExceptionHandlerTest` — test-only HTTP routes verify RFC 9457 error shape, status, safe details and envelopes.

GitHub Actions workflow `.github/workflows/api-ci.yml` runs `./mvnw -B -ntp verify` on Java 21 for changes to `apps/api`. The full document-only pipeline remains separate.

**Next**: Begin Sprint 1 authentication and Open Library/catalog vertical slice. New controller implementations must be added to `docs/implementation/implemented-operations.json` in lockstep with `docs/architecture/openapi.json`; 56 operations are planned, not yet working. The integrated foundation CI builds both applications and checks only the disposable Postgres service readiness; it does not claim migrations or database integration tests.

## Render Docker deployment (Java 21)

Container definition: `apps/api/Dockerfile`, with a non-root Java 21 runtime
and a multi-stage Maven build. CI compiles and boots the actual image, checks
`GET /api/v1/health`, and ensures unauthenticated private routes return 401.

On Render, use:
- **Name:** `ktob-api`
- **Runtime:** Docker, **Branch:** `main`
- **Region:** Frankfurt; **Instance:** Free ($0/month), when eligible
- **Root Directory:** `apps/api`
- **Dockerfile Path:** leave at default `./Dockerfile` when Root Directory is `apps/api` (no manual override necessary).
- **Port:** `8080` by default; the Spring app also honors Render's `PORT`

Start with no production DB migration. Before enabling database-backed routes,
apply the reviewed Flyway schema in a controlled KTOB-only migration step,
configure production PostgreSQL/JWKS credentials on Render, and set
`KTOB_DB_ENABLED=true` only after the migration has been verified.
Never set `KTOB_AUTO_MIGRATE=true` on production. The public health route
is available without database access for a safe initial deployment.

Never copy production database passwords into the Dockerfile, Git commits,
`ARG` values, or browser/Vercel variables.
