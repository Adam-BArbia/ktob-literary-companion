# KTOB HTTP contracts — design draft v0.2

**Source of machine-readable paths:** [openapi.json](openapi.json). All paths below have the provisional `/api/v1` prefix. The OpenAPI document is a **design artifact**, not a live deployment.

## Global contract

- All business endpoints require `Authorization: Bearer <Supabase access token>`, validated by Java for issuer/signature/audience/expiry/subject. Only `GET /health` is public and non-sensitive.
- Read/patch success `200`, creates `201`, delete `204`, idempotent collection-membership PUT `204`, recommendation request `200` (it returns a batch result); failures `application/problem+json` with `type,title,status,detail,code,traceId`.
- `401` no/invalid token, `403` explicit processing consent absent, `404` no visible/owned resource, `409` duplicate or idempotency-key reuse with changed body, `422` invalid transitions/edition mismatch, `429` throttled, `503` AI dependency unavailable.
- Partial PATCH bodies have distinct `*Patch` DTOs, at least one property required, not complete create DTOs.
- Every list endpoint with `meta.nextCursor` accepts `limit` (1–100, default 25) and opaque `cursor`. Sort by `createdAt DESC,id DESC` where meaningful; collection members use `addedAt ASC,entryId ASC`; external catalog uses stable provider order and ID. Cursors are reader-scoped. An empty `nextCursor`/null means the last page.
- `Idempotency-Key` is an optional UUID header on `POST /recommendations`, `POST /conversations/{id}/messages`, and `POST /library/{id}/acquisitions`. Store reader+method+path+key+request fingerprint for a proposed minimum 24 hours; identical replay yields prior result, conflicting payload yields `409`.

## R1 operations

| Module | Endpoints / rule |
|---|---|
| Reader | GET/PATCH `/me`; GET/PATCH `/me/privacy`; GET/POST `/me/boundaries`; PATCH/DELETE `/me/boundaries/{id}`; GET/POST `/me/preferences`; PATCH/DELETE `/me/preferences/{id}`; GET `/me/export` |
| Catalog | GET `/catalog/works`; GET `/catalog/works/{workId}`; GET `/catalog/works/{workId}/editions`; POST `/catalog/manual-works` |
| Library | GET/POST `/library`; GET/PATCH/DELETE `/library/{entryId}`; POST `/library/{entryId}/restore` |
| Collections | GET/POST `/collections`; PATCH/DELETE `/collections/{collectionId}`; **GET** `/collections/{collectionId}/entries`; PUT/DELETE `/collections/{collectionId}/entries/{entryId}` |
| Reading/journal | GET/POST `/library/{entryId}/experiences`; GET/PATCH `/experiences/{experienceId}`; GET/POST `/experiences/{experienceId}/journal`; PATCH/DELETE `/journal/{journalId}` |
| Advisor | GET/POST `/conversations`; GET/POST `/conversations/{conversationId}/messages`; POST `/recommendations`; GET `/memory-proposals`; POST `/memory-proposals/{proposalId}/decision`; GET `/memories`; PATCH/DELETE `/memories/{memoryId}` |
| Acquisition | GET `/catalog/works/{workId}/offers`; GET/POST `/library/{entryId}/saved-offers`; DELETE `/saved-offers/{offerId}`; GET/POST `/library/{entryId}/acquisitions`; PATCH/DELETE `/acquisitions/{acquisitionId}` |
| Health | GET `/health` (public liveness only) |

`DELETE /me` remains **BLOCKED** and is not published as an active OpenAPI operation until full account deletion, reauthentication, retention and purge semantics are approved.

## Contract examples

**Manual work, separate from private library:** `POST /catalog/manual-works` with `{"title":"A privately recorded work","authors":["Unknown author"]}` returns one canonical `BookWork.id` (`origin=MANUAL`, `ownerReaderId` verified from token). Then `POST /library` with `{"workId":"<UUID>"}`. The latter checks work visibility, optional edition belongs to work, and `UNIQUE(readerId,workId)`; duplicate returns `409`. No ownership or reading start is inferred.

**Reading session:** `POST /library/{entryId}/experiences` with `{"status":"CURRENTLY_READING","startedOn":"2026-11-20"}` creates one open experience. Historical entry with `FINISHED` / `PAUSED` / `DID_NOT_FINISH` requires `"historicalImport":true`. `WANT_TO_READ` is only a projected library shelf; it is **not** a valid experience status. Invalid PATCH transition returns `422`.

**Journal exclusion:** `POST /experiences/{experienceId}/journal` with `{"kind":"REFLECTION","body":"A remembered scene","emotionTags":["wistful"],"allowForPersonalization":false}` saves a private note. This note is excluded from all personalized AI contexts regardless of broader flags.

**Recommendation batch:** `POST /recommendations` with `{"mode":"SURPRISE","prompt":"Gentle but different","usePersonalContext":false,"boundaryExceptionIds":[]}` requires **current AI-processing consent**, separate from personalization. On missing consent: `403` problem code `AI_PROCESSING_CONSENT_REQUIRED`, **no provider request**. On provider unavailable: `503`. On success `200`:
```json
{"data":{"requestId":"c65b8e1d-30e3-4973-95a6-9a0899e0d6c6","items":[],"providerStatus":"OK","uncertaintyNote":"No candidates passed the current firm boundaries"}}
```
Items may be empty. Each candidate has a work identity, explanation, warning confidence and source/provenance where known. Exception IDs apply to **only this request**, never change stored boundaries. If warning data is unknown, the API never claims that an item definitely passes a firm restriction.

**Conversation turn:** `POST /conversations/{conversationId}/messages` requires processing consent at dispatch and returns **`201 {data:ConversationTurn}`** containing `userMessage`, `assistantMessage`, `proposalIds[]`. Both messages and any proposed (not approved) memories are persisted atomically after a successful provider response. Consent denied `403`; AI unavailable `503`, no committed turn.

**Approval and revocation:** `POST /memory-proposals/{id}/decision` accepts `APPROVE` or `DISMISS`. Approval creates at most one linked `ApprovedMemory` for the same reader. `PATCH /memories/{id}` changes **text only** while active; `DELETE /memories/{id}` terminally revokes. `active:true` is not a valid patch.

**Collection membership:** `GET /collections/{collectionId}/entries?limit=25&cursor=...` reads same-reader entries ordered by membership creation and entry ID. `PUT /collections/{collectionId}/entries/{entryId}` returns `204` whether membership already existed; the ownership chain is mandatory.

**Offer-unavailable response:** `GET /catalog/works/{workId}/offers?country=TN&format=PRINT&language=fr&maxPrice=50.00&currency=TND` (live verified provider **BLOCKED**) returns:
```json
{"data":[],"meta":{"providerStatus":"UNAVAILABLE","checkedAt":null,"reason":"No validated seller provider configured","nextCursor":null}}
```
Only actual verified provider results may use `VERIFIED_PROVIDER` here. `POST /library/{entryId}/saved-offers` records an immutable user-observed snapshot labelled `USER_SUPPLIED`. No R1 automatic recheck, inferred purchase or shelf change.

**Archive:** `DELETE /library/{entryId}` is non-destructive soft archive (`204`). `POST /library/{entryId}/restore` makes the same record visible again (`200`). A second library add is `409` even if archived; past reading/journal/offers/acquisition remain.

**R1 export:** `GET /me/export` returns `200 application/json` with exactly `{data:{version,generatedAt,readerId,library,experiences,journal,collections,preferences}}`. This is an *essentials export*, **not a full archive**. Other data categories are outside R1 export scope.


## Final targeted contract additions

**Chat personalization:** `Use permitted context` optionally extends both AI conversation and recommendation requests, but neither may make an external AI call without current `aiProcessingOptIn`. Context additionally requires `personalizationOptIn` and fine-grained scopes; per-note `allowForPersonalization=false` always excludes that journal entry.

**Acquisitions:** `Acquisition`, `AcquisitionWrite` and `AcquisitionPatch` use optional `paidPrice` nonnegative decimal strings (0–2 fractional digits) and supported uppercase ISO 4217 three-letter `currency`. Full objects and create bodies require both non-null together or both null/omitted. A PATCH with `{"paidPrice":"20.00"}` is permitted when the persisted currency remains valid. Backend merges changes atomically then validates the full pair; invalid pair yields `422 INVALID_MONETARY_PAIR`. `{"paidPrice":null,"currency":null}` clears both. Negative values and unsupported currency codes are invalid.

**Offer research:** `GET /catalog/works/{workId}/offers?maxPrice=50.00&currency=TND` is currency-qualified; `maxPrice` without valid `currency` returns `400 INVALID_PRICE_FILTER_CURRENCY`. Other-currency and unknown-price listings are excluded from the budget comparison; no exchange-rate conversion. Seller provider remains BLOCKED.

**Archived-entry operations:** After authentication and ownership lookup, PATCH library entry, POST reading experience, PATCH reading experience, POST/PATCH/DELETE journal, PUT/DELETE collection membership, POST/DELETE saved offer, and POST/PATCH/DELETE acquisition all return `409 LIBRARY_ENTRY_ARCHIVED` when the parent library entry is archived. They never mutate historical records. A cross-reader target yields `404`. Owner can still GET historic records; default collection-member listing hides archived entries and restoration reveals preserved memberships. Repeat archive DELETE `204` and POST restore are explicit exceptions.

## Unresolved BLOCKED areas

Professor's SOAP/REST/SOA rubric; AI provider selection/quotas; validated seller source; full account deletion and complete archival export; product details (ratings, reading progress units, spoiler policy). See [review gate](06-review-gates.md).
