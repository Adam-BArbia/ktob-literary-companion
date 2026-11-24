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

## Groq literary companion — scoped V3

The owner selected **GroqCloud / `openai/gpt-oss-120b`**, created an account/key, confirmed model visibility and reported **Global ZDR enabled**. This replaces the V2 unselected-provider state. It is account-control evidence supplied by the owner, not a measured KTOB inference result. Record actual credential-presence metadata, model response, quota/latency observations and release acceptance in the [V3 evidence](v3-release-demo.md).

`LiteraryAiPort` isolates the provider from advisor persistence and consent. The concrete `GroqLiteraryAiAdapter` calls only `https://api.groq.com/openai/v1/chat/completions` from Java, with redirects disabled. It does not activate provider tools, batch jobs, stored provider conversations or a paid fallback. The browser never receives `GROQ_API_KEY`.

Availability requires both a nonblank server-only key and deployment-managed `KTOB_GROQ_QUALIFIED=true`. Qualification defaults false and is set by the authorized release operator only after the account, retention and application checks. The owner is not required to add `AI_ENABLED`. Missing key or qualification returns sanitized `503 AI_PROVIDER_UNAVAILABLE`; core library/journal operations remain independent.

### Request and context policy

Before every external dispatch, verify reader ownership, exact per-request spoiler confirmation and current `aiProcessingOptIn`. A completed revocation is checked again immediately before sending. Missing processing consent returns `403 AI_PROCESSING_CONSENT_REQUIRED`; no generic prompt is exempt.

V3 context includes only the question, minimal selected-book title/author/language and at most four complete permitted turns from that same conversation. It does not query stored journal, reading history, profile, preferences or memories, regardless of personalization flags. `MessageWrite` accepts no `usePersonalContext` field. Both sides of previous full-spoiler turns are excluded for a new `NO_SPOILERS` request. Submitted questions are not silently truncated: if the required context exceeds the 6,000 UTF-8 byte resource budget, return `422 AI_CONTEXT_TOO_LARGE`.

Use `max_completion_tokens=1024`, `reasoning_effort=low`, `include_reasoning=false`, `temperature=0.4` and non-streaming responses. Groq's [reasoning guide](https://console.groq.com/docs/reasoning), rechecked during V3 review, confirms that GPT-OSS does not support `reasoning_format`; do not send that parameter. A 3-second connection timeout, 30-second total bound, 128,000-byte response limit, single admitted inference and minimum request spacing bound resource use. Other requests fail promptly with a retryable `429`, not an unbounded queue. Honor provider cooldown metadata; do not automatically retry.

Only one complete assistant content response for the selected model with a normal stop is accepted. Empty, malformed, reasoning-only, tool-call and incomplete outputs fail as unavailable. Valid reader/assistant messages are committed together after inference succeeds, with idempotency references in the same transaction. Provider failures leave no partially successful turn or fabricated assistant text. No model response is automatically approved as persistent memory; V3 always returns `proposalIds=[]`.

### Data handling and evidence

Groq's [data controls](https://console.groq.com/docs/your-data) describe ZDR for inference content while distinguishing operational metadata and limited exceptions. Its [model catalog](https://console.groq.com/docs/models), [OpenAI compatibility guide](https://console.groq.com/docs/openai) and [quota documentation](https://console.groq.com/docs/rate-limits) are the primary technical references. The owner reports enabling the organization-wide ZDR control; the application must still minimize data and cannot promise that no processing or retention of any kind occurs.

Startup diagnostics may contain only key-present and qualification booleans. Successful request diagnostics may contain model ID, elapsed milliseconds and validated numeric quota limits; errors may contain only status/category and bounded retry delay. Never log key values/prefixes/hashes/lengths, authorization headers, user identity, questions, answers or raw provider error bodies. Live tests use non-sensitive prompts, and mock tests must never be reported as real inference.

The [free API comparison](free-ai-api-options.md) remains a research snapshot of alternatives, not an automatic fallback policy. Stored personalization, memory, recommendations and verified seller offers remain outside V3.

## Verified bookstore search — source unselected

`BookOfferPort` should expose `search(work, country, format, language, maxPrice, currency, cursor)`, but leave the live provider **disabled** until validated for real Tunisia-first results and legal terms.

- On unavailable provider: `GET /catalog/works/{workId}/offers` returns `200 {data:[],meta:{providerStatus:"UNAVAILABLE",checkedAt:null,reason:"No validated seller provider configured",nextCursor:null}}` (subject to the existing OpenAPI response).
- `maxPrice` requires `currency`, else 400; no cross-currency comparisons or imaginary conversion. Unknown-price offers do not pass a maxPrice filter.
- `POST /library/{entryId}/saved-offers` stores a **user-supplied historical observation** with sourceType USER_SUPPLIED, seller, sourceUrl, observedAt, optional paired currency/price and availability. It is not a live verified offer.
- Saving offer/opening seller link never records an acquisition; `Acquisition` is an explicit reader record, not verified merchant fulfillment.
- No scraping of protected websites or AI-invented storefront listings.

## Feature flag / health policy

The Groq key and `KTOB_GROQ_QUALIFIED` are backend-only; missing qualification fails closed. The historical `AI_ENABLED` suggestion is superseded for V3. Verified seller search stays unconfigured. `/health` reports only service liveness, without keys or provider configuration. The UI distinguishes consent-required, rate-limited and unavailable states and never displays fake model output.

## Provider qualifications / demo

A professor demonstration can prove the Java consumes an external free service **through Open Library**, independently of the optional AI/seller integrations. This is a **scope decision for the demo**, not a claim the full consumer-facing Complete Core Experience is fully released. Before calling the public app complete, select and test AI and verified seller providers or visibly scope those experiences as unavailable/preview.
