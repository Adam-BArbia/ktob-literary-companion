# Sprint 0 engineering foundation — KTOB-003 through KTOB-006

**Scope:** first-party scaffolding and CI only; no production schema, app authentication, external AI calls, bookstore scraping, or account deletion.

## KTOB-003 — environment / repository hygiene

- Root `.gitignore` prevents new environment files, private key containers, build artifacts and node_modules from being committed.
- Three `.env.example` documents provide **placeholders**, not credentials. They are not read automatically. Config is injected through CI or hosting environment.
- `scripts/check_repo_hygiene.py` checks committed files and prohibits backend credential references inside browser source. It does **not** replace secret scanning, credentials review or Supabase Security Advisors.

## KTOB-004 — integrated CI

- `.github/workflows/foundation-ci.yml` runs Java 21 Maven tests, Node 24 `npm ci` / Vitest / Angular build, API synchronization and hygiene checks in one run.
- Creates an ephemeral `postgres:17-alpine` container and verifies the test database is reachable. **It does not run migrations or verify a schema**; those are Sprint 1 tasks KTOB-102 and KTOB-004's remaining database integration coverage.
- Independent existing Java CI, web CI and UML/OpenAPI CI remain in place.

## KTOB-005 — reusable backend HTTP types

- `ApiData<T>` and `ApiPage<T>` model OpenAPI `data` and list `meta.nextCursor` envelopes.
- `ApiException` with `ApiExceptionHandler` returns RFC 9457 `application/problem+json` with a safe `code` and generated `traceId`, no stack traces or private message disclosure.
- `PageWindow` validates size 1–100 (default 25), nonempty bounded opaque cursors; actual authenticated cursor creation/verification is Sprint 1–2 work. `UuidValue` rejects noncanonical/partial identifiers.
- Tests use **test-only** controller routes `/__test/...`; these routes do not exist in production.
- No authentication error handler is claimed before Spring Security is added in Sprint 1. 401/403 handling remains a future task.

## KTOB-006 — API contract synchronization

- `docs/architecture/openapi.json` remains the approved **35-path / 57-operation** design inventory.
- `docs/implementation/implemented-operations.json` lists the **currently implemented** Java operation IDs, initially `liveness` only.
- `scripts/check_openapi_sync.py` checks for unregistered method/path mappings and missing implemented routes; unknown mapping styles fail until parser is deliberately extended. It does not claim the other 56 operations are implemented.
- Tests still verify health payload, standard envelopes and safe problem shapes. OpenAPI and cross-UML validation remains a separate workflow.
- Before adding a Java controller, implement behavior and tests, then register its operationId in the same commit. If it differs from the approved contract, amend OpenAPI, UML/matrix and acceptance cases explicitly.

## Remaining before leaving Sprint 0

Review packaged startup smoke for the HTTP service and a hosted/staging readiness check; the completed framework foundation is enough to advance to Sprint 1 with disposable database migrations, JWT verification and Open Library adapter. **No manual testing is requested**; user acceptance happens after hosting the finished application.
