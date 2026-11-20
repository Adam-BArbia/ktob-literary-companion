# Sprint 1 — KTOB authenticated SOA vertical slice

Sprint 1 targets the first working reader-owned flow: Angular → Java REST → private PostgreSQL and Java → Open Library metadata. **No KTOB Supabase project is configured or modified yet**; only the unrelated Hani Maak project is visible in the connected Supabase account. DO NOT reuse it.

## Backend
- Verified Supabase JWTs are required on every route except `GET /api/v1/health`. JWT must use the configured HTTPS issuer and that issuer's JWKS, role and audience `authenticated` and UUID `sub`. With no Supabase issuer the private API fails closed as 401; do not use user metadata for authorization.
- `KTOB_DB_ENABLED=true` activates private `app` schema JDBC repositories. Flyway V1 creates reader profiles, default-false privacy settings, single canonical works/editions and owner-private library entries.
- Production migrations are **not** automatic. Only an explicitly disposable environment may set `KTOB_AUTO_MIGRATE=true`. Review production SQL, grants and backups before running them on hosted Supabase.
- Implemented endpoints: profile GET/PATCH, catalog lookup/search/manual work creation, owner library GET/POST/get individual, archive and restore.
- No JWT secrets, project credentials or database passwords committed; `.env.example` contains placeholders.
- Open Library: only sourced public work keys accepted; no book/price fabrication. Java requests identify the application by `OPENLIBRARY_CONTACT`. Missing contact or upstream failure produces 503 and the UI should offer manual work creation.

## Validation and limitations

The disposable PostgreSQL job executes Flyway and two-reader isolation/restore tests; the Open Library client has a local fake HTTP server test and does NOT depend on live Open Library in CI. Tests using `jwt()` use Spring Security's **test-only** verified token context, not a real Supabase issuer. Before hosting, verify a real token against a KTOB-specific project JWKS and test actual origin CORS and redirection.

The approved OpenAPI still documents 57 operations; only actual coded endpoints may be registered in `implemented-operations.json`. Full cursor pagination, edition lookup, library PATCH, reading history, complete logout/revocation, live provider availability and user authentication UI are separate implementation steps or follow-ups. User acceptance testing is deferred until hosting.

## Angular UI (Sprint 1)

The Angular application now includes:
- Supabase JS client locked in `package-lock.json`, sign-in/sign-up and automatic session refresh.
- Protected /library and /catalog/search routes. Backend remains the only authority for authentication/ownership.
- Catalog lookup through Java (GET /catalog/works), manual private work creation (POST /catalog/manual-works), and add-to-library POST.
- Library owner-only list, archive and restore controls; honest empty/loading/error states.
- Runtime public config supports `supabaseUrl`, `supabasePublishableKey`, and `apiBaseUrl`. In the absence of a dedicated KTOB project, the sign-in page reports 'not configured' instead of accepting fake credentials.

No business data is seeded and no manual user acceptance test is required before hosting. The backend's self-contained JDBC tests use only ephemeral PostgreSQL, and the UI's auth/config/API unit tests use controlled HTTP fakes.

Open Library adapter hardening: per-instance one-request-per-second throttle with ten-minute bounded in-memory result cache for repeated human searches. Live provider tests remain separate; no network call from CI.
