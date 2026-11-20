# Test coverage and evidence required per milestone

The current repository's GitHub workflow validates 16 PlantUML diagrams and the OpenAPI 3.1 document. These are **design tests**, not proof Java/Angular implementation works.

## Test matrix — minimum automated coverage

| ID | Type | Case / expected result | Milestone |
|---|---|---|---|
| A01 | Contract | 35 paths / 57 operations parsed; all refs resolve; no unauthorized DELETE /me | M0 |
| A02 | Unit/security | Bad signature, expired JWT, wrong issuer/audience rejected 401; no trusted user metadata | M1 |
| A03 | Two-user integration | A's library/manual work/collection/journal invisible to B; inaccessible UUID returns 404 | M1–M3 |
| A04 | Provider HTTP stub | Open Library success/empty/429/timeout; manual fallback; headers identify app | M1 |
| A05 | DB/migration | Empty database migrates; no `anon/authenticated` access to `app` business tables | M1 |
| A06 | Library | Duplicate work 409 including archived; restore reuses original row, original memberships persist | M2 |
| A07 | Reading lifecycle | No WANT_TO_READ experience, max one open experience, reread keeps old history | M2 |
| A08 | Rating / progress | 1, 3.5, 5 pass; 0.5, 5.5, 4.2 fail; progress 0,100 pass, -1,101,50.5 fail; no status auto-transition | M2 |
| A09 | Journal | Note body preserved; no AI personalization if flag false; delete owned note works | M2–M4 |
| A10 | Archive | Owner historic GET succeeds, descendant PATCH/POST/DELETE 409; B receives 404; restore re-exposes membership | M2 |
| A11 | Collections | PUT idempotent 204; membership only if both records owned by same reader | M2 |
| A12 | AI processing | aiProcessingOptIn=false → 403 and 0 outbound requests even for generic prompt | M4 |
| A13 | Personalization | Personalization false or scope false excludes history; only approved active memory included | M4 |
| A14 | Spoilers | Default NO_SPOILERS; explicit full spoilers with true confirmed; missing/inconsistent 422; prior full-spoiler history not reused when back to NO_SPOILERS | M4 |
| A15 | Firm boundaries | SURPRISE cannot bypass firm boundary; unknown warnings never certified safe | M4 |
| A16 | Memory | Proposals PENDING, approve/edit once; dismissed/revoked never silently reactivated | M4 |
| A17 | Provider unavailable | With AI_ENABLED=false, no calls, API 503; with seller source unset, truthful empty/unavailable metadata | M3–M4 |
| A18 | Monetary | Offer maxPrice requires currency 400; no FX; paidPrice decimal string/currency pair validation on create and merged PATCH | M3 |
| A19 | Export | Five owner-only arrays exactly, includes owned archived data, excludes B's data; label as partial JSON essentials | M3 |
| A20 | Idempotency | Same reader/key/body retry returns prior response; different payload with same key 409 | M3–M4 |
| A21 | UI E2E | Auth flow, catalog → library → reading → journal → archive/restore + responsive behavior | M2–M5 |
| A22 | SOA academic demo | Angular calls own Java REST; Java successfully calls free Open Library; evidence captured | M1/M5 |
| A23 | Deploy/operational | Render cold start, database outage, Open Library 429, CORS, TLS, no secret in bundle/log | M5 |

## Test frameworks (choices subject to compilation)

- Java: JUnit Jupiter, Spring Boot Test, MockMvc/RestAssured where supported, Testcontainers PostgreSQL, WireMock/mock HTTP server, Spring Security test JWT fixtures.
- Angular: Angular TestBed, TypeScript strict checks, browser E2E with Playwright, accessibility smoke and responsive viewports.
- Contracts: OpenAPI parser, JSON Schema examples, fixture-based DTO contract tests.
- Security: two independently authenticated test users and negative nested-resource ownership cases.
- No production provider API calls in routine CI. Use deterministic HTTP stubs. Select and document a controlled live call for demonstration.

## User acceptance script

1. Sign in as reader A; a minimal profile exists without forced questionnaire or AI consent.
2. Search Open Library book via Java (show network trace); create private manual work if no results.
3. Add to library; confirm WANT_TO_READ with no experience; start reading; enter 3.5 stars and 35% progress; save a journal note with AI opt-out.
4. Create a collection and membership; archive the book; review old journal; demonstrate writes blocked; restore and see membership back.
5. Export JSON; inspect five arrays; sign in as B and show A's UUID yields 404.
6. With providers disabled, demonstrate correctly labelled AI unavailable and seller unavailable UI; do **not** claim AI recommendations or live prices.
7. If an AI provider has been independently approved and enabled: show processing opt-in, no-spoiler default, explicit full-book-spoiler confirmation, memory proposal/approval and later revocation.
8. Show backend REST health/OpenAPI separate from Angular and actual Open Library consumption.

## Definition of pass

A test passing on mock data does **not** prove third-party provider policy, network availability or security in production. Final demo readiness requires deployment smoke tests, reviewed policy for enabled providers and no misleading claim about blocked deletion or verified sellers.
