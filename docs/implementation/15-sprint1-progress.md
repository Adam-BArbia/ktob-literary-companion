# Sprint 1 — KTOB authenticated SOA vertical slice

Sprint 1 implements the first reader-owned flow: Angular → Java REST → private PostgreSQL and Java → Open Library metadata. As verified on **23 November 2026**, the dedicated KTOB Supabase project `afavrsrffoyctyvvpxcv` is healthy and contains the five application tables. The frontend is hosted at [ktob-web-front.vercel.app](https://ktob-web-front.vercel.app), and the Java API at [ktob-api.onrender.com](https://ktob-api.onrender.com). KTOB uses its own project and must not reuse another application's database.

## Backend
- Verified Supabase JWTs are required on every route except `GET /api/v1/health`. JWT must use the configured HTTPS issuer and that issuer's JWKS, role and audience `authenticated` and UUID `sub`. With no Supabase issuer the private API fails closed as 401; do not use user metadata for authorization.
- `KTOB_DB_ENABLED=true` activates private `app` schema JDBC repositories. Flyway V1 creates reader profiles, default-false privacy settings, single canonical works/editions and owner-private library entries.
- Production migrations are **not** automatic. Only an explicitly disposable environment may set `KTOB_AUTO_MIGRATE=true`. Review production SQL, grants and backups before running them on hosted Supabase.
- Implemented endpoints: profile GET/PATCH, catalog lookup/search/manual work creation, owner library GET/POST/get individual, archive and restore.
- No JWT secrets, project credentials or database passwords committed; `.env.example` contains placeholders.
- Open Library: only sourced public work keys accepted; no book/price fabrication. Java requests identify the application by `OPENLIBRARY_CONTACT`. Missing contact or upstream failure produces 503 and the UI should offer manual work creation.

## Validation and limitations

The disposable PostgreSQL job executes Flyway and two-reader isolation/restore tests; the Open Library client has a local fake HTTP server test and does NOT depend on live Open Library in CI. Tests using `jwt()` use Spring Security's **test-only** verified token context, not a real Supabase issuer.

Hosted checks verified frontend runtime configuration and deep links, API health HTTP 200, anonymous `/me` rejection with HTTP 401, exact production-origin CORS and an ES256 Auth JWKS. Supabase security and health advisors reported no findings. The `app` schema is excluded from the Data API: a browser-key request returned HTTP 406, and `anon`/`authenticated` have no schema usage or reader/library SELECT/INSERT privileges. The backend uses the dedicated `ktob_app` role.

These checks do **not** establish confirmation-email delivery, the Auth redirect allowlist/SMTP configuration, or a successful authenticated production profile/catalog/library workflow. Email signup is enabled and confirmation is required; account creation, confirmation, sign-in and persistence still need an end-to-end acceptance pass with a real reader. Do not report mock-based auth tests or a healthy public endpoint as proof of that flow.

The approved OpenAPI documents 57 operations; **11 are currently registered** in `implemented-operations.json`. Full cursor pagination, edition lookup, library PATCH, reading history, journals, collections, AI conversations, acquisition workflows and the remaining contract operations are follow-ups. Live upstream availability and complete session-revocation behavior also require separate verification.

## Angular UI (Sprint 1)

The Angular application now includes:
- Supabase JS client locked in `package-lock.json`, dedicated `/auth` sign-in and `/auth/sign-up` registration routes, confirmation/resend guidance and automatic session refresh.
- Protected `/library`, `/catalog/search` and `/settings` routes. Backend remains the only authority for authentication/ownership.
- Catalog lookup through Java (GET /catalog/works), manual private work creation (POST /catalog/manual-works), and add-to-library POST.
- Library owner-only list, archive and restore controls; honest empty/loading/error states.
- Runtime public config supplies `supabaseUrl`, `supabasePublishableKey`, and `apiBaseUrl` for the dedicated KTOB project and hosted Java API. Missing or invalid configuration produces an honest unavailable state instead of accepting fake credentials.
- Responsive reading workspace, account/privacy screens and explicit unavailable states for features that are not implemented. Design principles are recorded in the [UI design guide](16-ui-design-guide.md).

No business data is seeded. The backend's self-contained JDBC tests use only ephemeral PostgreSQL, and the UI's auth/config/API unit tests use controlled HTTP fakes. Production reader data must not be used as a CI fixture.

Open Library adapter hardening: per-instance one-request-per-second throttle with ten-minute bounded in-memory result cache for repeated human searches. Live provider tests remain separate; no network call from CI.
