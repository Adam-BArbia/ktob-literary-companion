# HTTP implementation contract — OpenAPI remains authoritative

Machine-readable [OpenAPI 3.1 v0.3](../architecture/openapi.json) contains **35 paths / 57 operations**, including request bodies and response status codes. Do not retype a divergent 58th route from this document. Route naming and schema examples are in [HTTP catalogue](../architecture/02-api-contract.md).

## Uniform handling

| Case | Rule |
|---|---|
| Base | `/api/v1` HTTPS, JSON; `GET /health` public and minimal |
| Authentication | Verified Supabase user access token on every other route; no caller-supplied `readerId` |
| Ownership | Owner-scoped lookup first, other-reader and missing same `404`; no BOLA leaks |
| Success | `200` GET/PATCH/recommendation batch; `201` POST creation; `204` DELETE and idempotent membership PUT |
| Failure | RFC 9457 `application/problem+json`, stable `code`, safe `traceId`; field validation 400/422, conflict 409, consent 403, provider outage 503 |
| Pagination | Opaque bounded `limit` and `cursor`; cursor scoped to reader, deterministic stable order; `meta.nextCursor` null when done |
| Money | Decimal **string** (never binary float), currency checked against allowed ISO 4217 codes; two fields paired on full records; PATCH validates merged state |
| Idempotency | Optional UUID `Idempotency-Key` on AI conversation, recommendation, acquisition POST; same key/payload reproduces stored response, changed payload 409 |
| Storage | DTO ↔ Java domain ↔ repository mapping explicit; never expose JPA entities directly |

## Required edge cases

**Add existing work**: reject duplicate reader+work (including archived) with 409. Restoration via `POST /library/{entryId}/restore`, no second library row. Private manual work of another reader returns 404.

**Reader archive**: `DELETE /library/{entryId}` idempotently archives (204); owner GET of archived and historic children allowed; entry PATCH/child writes return 409 `LIBRARY_ENTRY_ARCHIVED`. Nonowner check always precedes archive check. Restoring recovers previous collection memberships.

**Reading**: start CURRENTLY_READING or explicit historical import; no WANT_TO_READ experience status; enforce one open experience. Rating nullable 1–5 step .5, progressPercent nullable integer 0–100. No automatic status updates or forced 100% completion.

**Conversation**: `POST /conversations/{conversationId}/messages` returns 201 `ConversationTurn(userMessage,assistantMessage,proposalIds,spoilerLevel)` on successful provider call only. If AI processing not consented: 403, no outbound request; if provider unconfigured/outage: 503; no half-persisted turn. If FULL_BOOK_SPOILERS without explicit same-request confirmation: 422; earlier full-spoiler history excluded or redacted on later NO_SPOILERS turn. Approved-memory proposal remains PENDING until reader decision.

**Recommendations**: `POST /recommendations` returns 200 `RecommendationResult(requestId,items[],providerStatus,spoilerLevel)`; zero items valid; strict boundaries and unknown warning handling persist. Same 403/422/503 handling as chat. Never silently personalize without per-request opt-in and scope checks.

**Offer lookup**: unconfigured source: `data=[]` and `meta.providerStatus=UNAVAILABLE`, not a mock merchant. `maxPrice` requires explicit `currency` (400 otherwise), only compare within same currency; no guessed FX conversions. Historical user-supplied saved offer sourceType remains USER_SUPPLIED.

**Data export**: GET `/me/export` returns JSON `{data:{version,generatedAt,readerId,library,experiences,journal,collections,preferences}}`. Includes owned archived items, no other readers, no hidden AI memory/chat/offers/acquisition promised as exported. Do not label it total portability.

**Account deletion**: `DELETE /me` absent from OpenAPI and intentionally inactive. Do not introduce it to satisfy an imaginary endpoint count.

## DTO and service design decisions

Map Java `BigDecimal` to JSON decimal-string money and rating validation to exact increments; represent `progressPercent` as `Integer`; use `Instant` for UTC timestamps, `LocalDate` for dates, UUID for identities and Java enum for lifecycle states. Differentiate omitted/explicit-null optional PATCH fields (especially paidPrice/currency). For RFC 9457 in Spring Boot 4.1, use supported `ProblemDetail` plus stable `code` extension and sanitized server-generated `traceId`.

## Contract review checklist

Before shipping each route: match OpenAPI operationId, payload constraints, cursor response shape, 401/403/404/409/422/503 behavior, authenticated owner filter, archived parent rules, and tests. Keep OpenAPI codegen optional: prefer a single generated client/interface if it passes compilation and does not hide semantics. Any contract change requires OpenAPI + UML/architecture update + CI.
