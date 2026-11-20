# External services and deployment — design draft v0.2

## One modular runtime

Angular static frontend on Vercel communicates over HTTPS with **one** Spring Boot Java 21 deployment on Render Free. Supabase provides PostgreSQL and Supabase Auth. The Java process contains reader/privacy, export coordinator, library/journal/collections, catalog, advisor, acquisition and adapter modules; these are logical modules, **not** multiple deployed microservices. SOAP, WSDL or a service registry may be necessary if the professor explicitly requires them (**BLOCKED**).

## Open Library [PROPOSED]

The catalog adapter calls Open Library search/work/edition APIs with a properly identifying user agent, bounded pagination and caching/rate limits. Metadata may be incomplete; edition format may be null when unknown; contributor role is contextual to each work credit. Catalog source IDs are not guaranteed globally complete identifiers. If a catalog query fails or returns nothing, reader may **first create a private MANUAL work** under the same canonical work ID scheme, then add it to the private library. Never infer manual ownership from a user-submitted ID without verification.

## AI adapter [PROPOSED / model BLOCKED]

AI provider selection and free-tier/retention feasibility remain unapproved. The adapter receives the request only after Java checks `aiProcessingOptIn` immediately before dispatch; even a non-personalized AI prompt requires permission. Further context is allowed only with `personalizationOptIn`, `usePersonalContext`, appropriate scope flags and per-journal exclusion. Degraded behavior for documented AI endpoints is `403` when consent absent and `503` when provider unavailable. Explicit distinct non-AI discovery may be added later, but these endpoints do not masquerade as such.

A model-generated recommendation requires book identity resolution, confidence/provenance qualification and firm-boundary checks. Unknown source data is unknown, not proof of safety. A returned batch can contain zero qualified items.

## Verified seller search [BLOCKED]

No selected vendor or legal/coverage validation. `GET /catalog/works/{workId}/offers` accepts `country`, `format`, `language`, `maxPrice`, `currency`, pagination; returns `{"data":[],"meta":{"providerStatus":"UNAVAILABLE","checkedAt":null,"reason":"No validated seller provider configured","nextCursor":null}}` when unconfigured. A maxPrice filter requires an active ISO 4217 currency query code, or return 400 INVALID_PRICE_FILTER_CURRENCY. Budget filtering compares prices **only** within that matching currency, excluding unknown/different-currency prices; no FX conversion is implied. Never fabricate prices, merchants or availability. No AI hallucinated offer is a verified source.

A saved historical listing is `USER_SUPPLIED` with immutable `observedAt`, source URL, optional price/currency pair and availability enum. `VERIFIED_PROVIDER` is reserved for actual provider observations. Rechecking and alerts are **R2**. Neither offer saving nor seller navigation records acquisition.

## Reliability and free hosting

One low-memory Render instance, potentially sleeping and cold-starting. Use bounded DB pool, limited provider concurrency, timeouts, retry/backoff respecting provider quotas, and no unbounded jobs. Render free plan and Supabase free quotas must be reverified near deployment; the plan is not a guarantee of constant uptime. Auth and private journal operations should remain independently available when Open Library or AI fails, except workflows requiring that upstream.

Proposed config names (no secrets stored here): `KTOB_API_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` for frontend; `DATABASE_JDBC_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `SUPABASE_ISSUER`, `SUPABASE_JWKS_URL` where applicable, `OPENLIBRARY_CONTACT`, `AI_PROVIDER_KEY`, `ALLOWED_WEB_ORIGINS` for Render. Spring Boot JVM DB connection may require the Supabase **session pooler** for IPv4 hosting. Confirm its configuration before implementation.

## Validation scenarios for future implementation

Two-reader IDOR tests; manual work privacy; idempotent membership; archived entry restoration; reread preserving old history; AI consent absence and revocation at dispatch; excluded journal entries; memory approval/revocation; batch recommendation with unknown warning; verified provider absence; nullable edition format; cold starts; safe DB failures. No live tests have been performed.
