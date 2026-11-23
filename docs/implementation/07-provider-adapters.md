# External integration ports, quotas and fail-closed rules

## Open Library — approved core external service

**Primary SOA external-service proof**: Java `BookMetadataPort` → `OpenLibraryHttpAdapter` → `https://openlibrary.org/search.json`, works/editions endpoints where available. Do not call Open Library directly from the Angular browser for KTOB business behavior.

Proposed interface:

```java
interface BookMetadataPort {
    CatalogSearchResult search(String query, int limit, String cursor);
    Optional<BookWorkMetadata> work(String externalId);
    List<BookEditionMetadata> editions(String externalWorkId);
}
```

- Identity: `User-Agent: KTOB (<application-contact>)`; valid public contact supplied via environment variable, not a credential. Open Library currently documents nominal 1 request/sec unidentified and 3 request/sec identified; implement a **lower conservative** global limit across the Java instance, bounded cache, backoff on 429 and concurrency limits.
- Search: exact `GET /search.json?q=` + bounded `limit`, parse `key`, title, authors, languages, edition references with missing/uncertain fields. Source IDs are not guaranteed to be ISBN; preserve metadata provenance and use canonical KTOB UUID work IDs.
- Security: outbound HTTPS only, fixed allowlisted host, URL-encode queries; do not allow user-controlled arbitrary source URLs to trigger backend SSRF. No scraping HTML, no bulk harvesting.
- Failure: `timeout`, `429`, empty results, partial metadata, provider outage; return appropriate `providerStatus`/unavailable behavior and offer **private MANUAL work creation**. Never fabricate author/edition.
- Test with HTTP stub (e.g. WireMock or MockWebServer) plus at least one documented live demo call (if permitted by provider policies). Cache tests avoid false upstream dependency during CI.

Official Open Library policy: https://openlibrary.org/developers/api

## AI provider — not selected / isolated integration

The **`LiteraryAiPort`** contract should be implemented as a deny-by-default adapter first:

```java
interface LiteraryAiPort {
    AiTurn complete(AiRequest request) throws ProviderUnavailable;
}
```

Input includes only: authenticated request text, effective spoiler policy, allowed minimal personalization subset, strict content boundaries and bounded token/time budget. Output is untrusted; model claims about content labels, book availability, facts or offers require independent qualification. Configuration `AI_ENABLED=false` by default. With no approved provider, message/recommendation operations return **503** and do not invoke a third-party endpoint; client displays a truthful “AI unavailable” state, while reading and journal operations remain usable.

**Required provider decision evidence before enabling:** actual model and account availability on no-credit-card/free constraints, Tunisian/global access, rate/quotas, supported languages, latency and output limits, privacy/data retention terms, safety filters and confirmation that private prompts/journals are permitted under user consent and the provider's contract. Candidate `Groq` is **not** approved as of this handoff; no API key or service setup is implied. Use feature flag and adapter tests; no provider mock exposed as production AI.

**Strict inference boundary:** Do not treat explicit user consent as proof that third-party retention terms are acceptable. Do not quietly transform chat into approved persistent memory. Recommendations remain a 0..N batch with firm content-boundary validation; unknown evidence ≠ safe. A new NO_SPOILERS turn must not receive full-spoiler prior history.

**Overnight release qualification:** Official Groq model/quota/data-handling references were reviewed, but no user account/key, actual Tunisian access, inference latency or retention configuration was verified. B16 therefore remains unmet and no real inference occurred. See the [sourced qualification record](overnight-release-demo.md#provider-qualification-result-for-this-release). The existing unavailable UI is intentional; this release does not claim an operational AI adapter or conversation API.

The [free AI API comparison](free-ai-api-options.md) recommends evaluating Groq first and Cloudflare Workers AI second, with sourced account, quota and data-handling limitations. That research is a candidate assessment, not an activated provider or a measured literary benchmark; the qualification and consent gates above still apply.

## Verified bookstore search — source unselected

`BookOfferPort` should expose `search(work, country, format, language, maxPrice, currency, cursor)`, but leave the live provider **disabled** until validated for real Tunisia-first results and legal terms.

- On unavailable provider: `GET /catalog/works/{workId}/offers` returns `200 {data:[],meta:{providerStatus:"UNAVAILABLE",checkedAt:null,reason:"No validated seller provider configured",nextCursor:null}}` (subject to the existing OpenAPI response).
- `maxPrice` requires `currency`, else 400; no cross-currency comparisons or imaginary conversion. Unknown-price offers do not pass a maxPrice filter.
- `POST /library/{entryId}/saved-offers` stores a **user-supplied historical observation** with sourceType USER_SUPPLIED, seller, sourceUrl, observedAt, optional paired currency/price and availability. It is not a live verified offer.
- Saving offer/opening seller link never records an acquisition; `Acquisition` is an explicit reader record, not verified merchant fulfillment.
- No scraping of protected websites or AI-invented storefront listings.

## Feature flag / health policy

Feature flags `AI_ENABLED` and `VERIFIED_OFFERS_ENABLED` are backend-only, off by default until provider gates. `/health` reports only service liveness; do not expose third-party API keys or provider configuration publicly. Frontend translates providerStatus into a clear state; don't claim to have prices or recommendations when adapters are disabled.

## Provider qualifications / demo

A professor demonstration can prove the Java consumes an external free service **through Open Library**, independently of the optional AI/seller integrations. This is a **scope decision for the demo**, not a claim the full consumer-facing Complete Core Experience is fully released. Before calling the public app complete, select and test AI and verified seller providers or visibly scope those experiences as unavailable/preview.
