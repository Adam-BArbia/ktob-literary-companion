# Providers, integration boundaries and deployment draft

## Topology

- **Vercel:** Angular compiled static frontend; browser communicates with Java over HTTPS and Supabase Auth for sign-in.
- **Render Free:** one Spring Boot Docker web service, exposing `/api/v1` and limited `/health`. Module boundaries are in-process; this is not a network microservices deployment.
- **Supabase:** PostgreSQL private schema + Supabase Auth. Spring Boot uses TLS and the supported direct/session pooled database connection.
- **Book provider:** Open Library public API. **AI provider:** provisional Groq candidate, adapter hides model and availability. **Price provider:** unselected.

## Open Library adapter — PROPOSED

Use human-initiated metadata search: `GET https://openlibrary.org/search.json?q=...&limit=...` and documented work/edition endpoints. Honor app-identifying `User-Agent` contact header. Default requests are limited to **1/sec**, or **3/sec** when identified, subject to provider changes; employ caching and bounded page sizes. Open Library metadata is incomplete; return provenance and unknown states rather than invented details. No HTML scraping and no bulk mirrored dataset.

Reference: https://openlibrary.org/developers/api and https://openlibrary.org/dev/docs/api/search

## AI adapter — PROVISIONAL

- Provider/model chosen after free-tier/privacy tests, not assumed stable.
- Store provider key in Render only; never frontend. Bound token budget, timeout, context size, daily quota. Never send disallowed journal entries.
- AI response is **untrusted**: validate suggested work against catalog, enforce boundaries, provide source/uncertainty qualifiers. Don't treat a model's assertion of availability, price, content warning, or personal memory as proof.
- If provider is unavailable: explicit degraded state or local non-AI discovery, never silent fabrication.

## Seller research — BLOCKED

No provider chosen. A verified offer needs a retrievable seller URL, observed time, format, country and stated currency/price if known. When missing, `providerStatus=UNAVAILABLE`, `data=[]`. Readers may save personally observed listings, labelled **user-supplied**, but these are not provider-verified and must not be presented as live prices. Source rights/robots/terms and regional coverage must be reviewed.

## Render resource budget and resilience

One Java process with careful heap sizing (to be measured, not assumed), Spring Boot startup/health probes, limits on concurrent AI work, provider connection timeouts, no unbounded database pool. Sleeping/cold starts are expected. Read/write queries must still work without AI or Open Library being online (except operations requiring them).

## Deployment configuration candidates (names, NOT secrets)

| Component | Name | Purpose |
|---|---|---|
| Angular | `SUPABASE_URL` | Public Supabase project address |
| Angular | `SUPABASE_PUBLISHABLE_KEY` | Publishable frontend credential (public) |
| Angular | `KTOB_API_URL` | HTTPS address of Java API |
| Render | `DATABASE_JDBC_URL` | TLS PostgreSQL JDBC connection |
| Render | `DATABASE_USERNAME` | Least-privilege service DB user |
| Render | `DATABASE_PASSWORD` | Secret |
| Render | `SUPABASE_ISSUER` | Exact token issuer |
| Render | `SUPABASE_JWKS_URL` | Verified project's asymmetric signing keys (if enabled) |
| Render | `ALLOWED_WEB_ORIGINS` | Strict CORS origins |
| Render | `OPENLIBRARY_CONTACT` | App identification contact |
| Render | `AI_PROVIDER_KEY` | Secret, only when provider is selected |

Actual Angular environment injection at build time and environment naming should be finalized during implementation. Do not commit credentials or `.env` files.

## Integration/availability tests (future)

1. Authenticated reader A creates entry; reader B cannot access it by ID.
2. Open Library returns zero matches or times out -> manual book fallback.
3. AI disabled -> no outbound request; personalization disabled -> no history transmitted.
4. AI proposes a memory -> cannot become approved without explicit reader action.
5. Seller source unconfigured -> empty/unavailable status, never fake price.
6. Service cold start -> frontend handles delayed first response gracefully.
7. Database unreachable -> bounded failure with safe error, no leak of connection string.
