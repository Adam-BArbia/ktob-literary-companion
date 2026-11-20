# HTTP API contract catalogue (v0.1, PROPOSED)

**Base path:** `/api/v1`. **Frontend:** Angular on Vercel. **Provider:** Spring Boot on Render. `openapi.json` is the machine-readable companion, with request/response types and operations.

## Global rules

- HTTPS only; `Authorization: Bearer <Supabase access token>` required except health. Java validates signature, issuer, audience, expiry, subject, session policy (where applicable) and row ownership. Never accept `readerId` from a client as authority.
- Success: `200` read/edit, `201` create, `204` delete. Body wraps successful resources in `{"data":...}` and collections may include `meta.nextCursor`.
- Errors: RFC 9457 `application/problem+json` with `type,title,status,detail,code,traceId`; no hidden existence leaks on another user's resource (prefer `404`).
- `400` invalid syntax, `401` no/invalid login, `403` denied consent/permission, `404` missing or not owned, `409` duplicate/conflict, `422` invalid business transition, `429` rate-limited, `502/503` upstream unavailable.
- List endpoints accept bounded `limit` and opaque `cursor`. IDs = UUID; timestamps = RFC3339 UTC. Monetary amounts = decimal strings. `Idempotency-Key` recommended for AI message/recommendation requests and acquisition creation (strategy to approve).
- Never use public links or record existence as evidence of ownership of a private item.

## Endpoint inventory

### Reader and privacy
| Verb | Endpoint | Behavior |
|---|---|---|
| GET / PATCH | `/me` | Own profile only |
| GET / PATCH | `/me/privacy` | AI processing, personalization, fine-grained scopes |
| GET / POST | `/me/boundaries` | Content boundaries |
| PATCH / DELETE | `/me/boundaries/{id}` | Change or remove owned boundary |
| GET / POST | `/me/preferences` | Explicit literary preferences |
| PATCH / DELETE | `/me/preferences/{id}` | Update/remove preference |
| GET | `/me/export` | Bounded R1 export of reader-owned essentials |
| DELETE | `/me` | Destructive account deletion **BLOCKED** pending re-auth and retention decision |

### Catalog and reader's library
| Verb | Endpoint | Behavior |
|---|---|---|
| GET | `/catalog/works?q=&limit=&cursor=` | Open Library search, with provider status |
| GET | `/catalog/works/{workId}` | Known metadata / uncertainty |
| GET | `/catalog/works/{workId}/editions` | Available editions; often incomplete |
| POST | `/catalog/manual-works` | Reader-private manual catalog fallback |
| GET / POST | `/library` | Own list and add work |
| GET / PATCH / DELETE | `/library/{entryId}` | Own entry; favorite and intent are independent |
| GET / POST | `/collections` | Reader collections |
| PATCH / DELETE | `/collections/{collectionId}` | Collection metadata |
| PUT / DELETE | `/collections/{collectionId}/entries/{entryId}` | Add/remove own work |

### Reading and journal
| Verb | Endpoint | Behavior |
|---|---|---|
| GET / POST | `/library/{entryId}/experiences` | List/create a separate reading or reread |
| GET / PATCH | `/experiences/{experienceId}` | Own dates, progress, status, rating |
| GET / POST | `/experiences/{experienceId}/journal` | Own dated notes, quotes, emotion, per-entry AI exclusion |
| PATCH / DELETE | `/journal/{journalId}` | Edit/remove journal item |

### Literary advisor
| Verb | Endpoint | Behavior |
|---|---|---|
| GET / POST | `/conversations` | General or per-book primary chat |
| GET / POST | `/conversations/{conversationId}/messages` | Fetch/send messages (requires AI processing consent for model call) |
| POST | `/recommendations` | Explained candidates, mode, strict boundary filter |
| GET | `/memory-proposals` | Pending reader decisions |
| POST | `/memory-proposals/{proposalId}/decision` | Explicit approve/edit or dismiss |
| GET | `/memories` | Approved active memories |
| PATCH / DELETE | `/memories/{memoryId}` | Edit/revoke own memory |

### Offers and acquisition
| Verb | Endpoint | Behavior |
|---|---|---|
| GET | `/catalog/works/{workId}/offers` | Verified listings **BLOCKED** until provider selected; empty/unavailable fallback |
| GET / POST | `/library/{entryId}/saved-offers` | Reader's historical, sourced snapshots |
| DELETE | `/saved-offers/{offerId}` | Unsave, not purchase |
| GET / POST | `/library/{entryId}/acquisitions` | Real owned/borrowed/digital access events |
| PATCH / DELETE | `/acquisitions/{acquisitionId}` | Correct own event |

### Operational
| Verb | Endpoint | Behavior |
|---|---|---|
| GET | `/health` | Safe liveness, not a leak of credentials or database state |

## Example 1 — Add book to library

`POST /api/v1/library`
```json
{"workId":"8321da6f-4f7e-4237-9512-6e8d79be725d","preferredEditionId":null}
```
`201`
```json
{"data":{"id":"a7c0b526-52b7-4daa-94dc-ec02569a0e16","workId":"8321da6f-4f7e-4237-9512-6e8d79be725d","shelfStatus":"WANT_TO_READ","favorite":false,"acquisitionIntention":false}}
```
A reader cannot add the same work twice; a duplicate returns `409` with the existing entry discoverable through their own library.

## Example 2 — Log a reread

`POST /api/v1/library/{entryId}/experiences`
```json
{"status":"CURRENTLY_READING","editionId":null,"startedOn":"2026-11-20"}
```
Creates a new experience without replacing older finished experiences. A note can be posted to `/experiences/{experienceId}/journal` even without a progress update.

## Example 3 — Preserve a reflection without sharing with AI

`POST /api/v1/experiences/{experienceId}/journal`
```json
{"kind":"REFLECTION","body":"A quiet scene that stays with me.","emotionTags":["wistful"],"allowForPersonalization":false}
```
The backend keeps this out of AI personalization even if global personalization is on.

## Example 4 — Request recommendations

`POST /api/v1/recommendations`
```json
{"mode":"SURPRISE","prompt":"Something surprising but gentle","usePersonalContext":false,"boundaryExceptionIds":[]}
```
Response contains sourced/qualified suggestions. If `aiProcessingOptIn=false`, use an explicitly labelled non-AI fallback or a clear consent-required error; never forward prompts or journal context without consent.

## Example 5 — AI memory

`POST /api/v1/memory-proposals/{proposalId}/decision`
```json
{"decision":"APPROVE","editedText":"I enjoy stories with reflective narrators."}
```
The approved memory can then be used *only when personalization is allowed*. Dismissal is not a negative literary preference.

## Example 6 — Find a copy

`GET /api/v1/catalog/works/{workId}/offers?country=TN&format=PRINT`
```json
{"data":[],"meta":{"providerStatus":"UNAVAILABLE","checkedAt":null,"reason":"No verified seller research provider configured"}}
```
Prices, stock, and sellers must never be fabricated.

## Non-goals for v0.1

No AI stream contracts, price alerts, advanced edition matching, family/shared accounts, PDF/EPUB import, or unspecified seller scrapers. Service registry/WSDL not authored until actual professor rubric is obtained. Exact R1 user export format still requires approval.
