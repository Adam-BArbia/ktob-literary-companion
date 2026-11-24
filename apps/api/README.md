# KTOB Java API — private reading journal and literary companion

**Implemented:** authenticated reader/catalog/library, reading experiences, private journals, privacy settings and persisted literary conversations. The [operation registry](../../docs/implementation/implemented-operations.json) distinguishes implemented routes from the complete R1 design. Deployment and actual provider inference evidence are recorded separately in the [release guide](../../docs/implementation/overnight-release-demo.md). Public health can still run without a database or secrets.

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

The path and exact response shape are defined by `docs/architecture/openapi.json` (`GET /health` under the `/api/v1` server prefix). Health reports liveness only; it does not report private provider configuration or prove database/auth/provider readiness.

## Tests

- `KtobApplicationTests.contextLoads` — Spring context bootstraps.
- `HealthControllerTest.livenessMatchesThePublishedOpenApiContract` — verifies HTTP 200, JSON response and expected status.
- `HealthControllerTest.livenessDoesNotDependOnAuthentication` — public endpoint remains reachable.
- `ApiPrimitivesTest` — pagination bounds, UUIDs and response value objects.
- `ApiExceptionHandlerTest` — test-only HTTP routes verify RFC 9457 error shape, status, safe details and envelopes.

GitHub Actions runs `./mvnw -B -ntp verify` on Java 21. Database integration tests run only when `KTOB_TEST_POSTGRES=true` against an explicitly disposable PostgreSQL database. Its configuration supplies `KTOB_AUTO_MIGRATE=true` so Flyway replays V1–V3. Never use this test setup against production.

Advisor tests cover owner isolation, consent/revocation, separate personalization settings, scoped pagination, whole-turn spoiler filtering, canonical idempotency, atomic persistence failures, concurrency and migration privileges. The Groq adapter uses a local HTTP stub for controlled failures/timeouts in automated tests. A stub response is not evidence of live Groq inference.

## Groq configuration and operating boundaries

- Store `GROQ_API_KEY` privately on the Render backend. It must never appear in source, logs, frontend settings or a Vercel build.
- `KTOB_GROQ_QUALIFIED` defaults to `false`. The deployment operator may set this non-secret qualification setting to `true` only after account/model, free-tier, global ZDR, code and consent checks. No separate `AI_ENABLED` variable is required.
- Both a nonblank key and qualification are required. Startup logs expose only `keyConfigured` and `qualificationConfirmed` booleans; health stays liveness-only. A missing/unqualified provider fails closed with `503 AI_PROVIDER_UNAVAILABLE`.
- The adapter uses only the fixed Groq chat-completions endpoint and `openai/gpt-oss-120b`, with no tools, provider-stored conversation, paid fallback or automatic retry. It bounds the entire response wait to 30 seconds, returned bytes to 128,000, and completion tokens (including reasoning) to 1,024. Reasoning effort is low and reasoning is excluded from the response.
- One inference may run per JVM, with at least two seconds between provider dispatches. A provider `429` establishes a bounded cooldown using `Retry-After` (seconds or HTTP date, up to one day); the API exposes the retry delay. Reading and journal operations do not require Groq.
- Privacy flags all default false. Current AI processing consent is checked immediately before dispatch. Revoking consent cannot undo a request already sent. The privacy row is not locked during inference.
- V3 sends only the submitted question, minimal selected-book metadata and up to four whole permitted previous turns fitting a 6,000 UTF-8-byte total context budget. It never reads stored journal content, reading history, personal preferences or memories into AI context, even if personalization flags are enabled.
- `NO_SPOILERS` is the default on every request. Full spoilers require matching explicit confirmation on that request; both sides of prior full-spoiler turns are excluded from later no-spoiler context. Spoiler avoidance remains best effort.
- Conversations belong directly to a reader and optionally a visible canonical work. They remain independent of library archive; no library row lock is held during inference.
- A successful turn atomically stores reader and assistant messages. Optional UUID `Idempotency-Key` is scoped to the reader and conversation. Canonical equivalent request/defaults replay the stored result; a changed body or policy conflicts. Replay still requires current processing consent. Failed provider calls create no committed turn or successful idempotency record.
- Message list order is descending timestamp/UUID; reader and assistant timestamps are strictly ordered so clients may reverse pages for chronological presentation. Conversation creation is local storage and does not itself call Groq.
- `KTOB_QA_WEB_ORIGIN` optionally appends one exact HTTPS `*.vercel.app` deployment origin to the unchanged `ALLOWED_WEB_ORIGINS`. It rejects wildcards, multiple origins, ports, user information, paths, queries and fragments. The operator must verify the deployment belongs to the existing KTOB Vercel project before setting it, and clear it after preview acceptance. Syntax validation alone does not establish ownership. Browser credentials remain disabled; private calls use verified bearer tokens.

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

Before deploying code that depends on a new schema,
apply its reviewed additive SQL in a controlled KTOB-only migration step,
configure production PostgreSQL/JWKS credentials on Render, and set
`KTOB_DB_ENABLED=true` only after the migration has been verified.
Never set `KTOB_AUTO_MIGRATE=true` on production. The public health route
is available without database access for a safe initial deployment.

Never copy production database passwords into the Dockerfile, Git commits,
`ARG` values, or browser/Vercel variables.
