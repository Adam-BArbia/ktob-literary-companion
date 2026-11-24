# KTOB V3 — literary companion release and demonstration

**Release date:** 24 November 2026, Tunisia time. **Status: implementation and staged verification in progress.** This record distinguishes completed observations from pending acceptance. The [V2 release record](overnight-release-demo.md) remains the historical evidence for the reading-journal release.

## Authorized scope and baseline

The owner explicitly authorized the focused star repair, V2 regression work, Groq integration, consent and spoiler controls, reviewed additive migrations, CI-verified PR merges, and deployment to the existing KTOB services. This authorization supersedes the earlier documentation-only implementation restrictions for this scope. It does not authorize destructive database operations, paid services, secret disclosure, or unrelated integrations.

| Baseline | Recorded value |
|---|---|
| Repository / pre-V3 main | `Adam-BArbia/ktob-literary-companion`, `bd7745cab4811ce3b1446e6564617b94675f160a` |
| Production application | https://ktob-web-front.vercel.app |
| Production API health | https://ktob-api.onrender.com/api/v1/health |
| Render service | Existing `ktob-api` in adam's workspace; pre-V3 LIVE deployment `dep-dc2csde8bjmc73f9kn80` at `bd7745cab4811ce3b1446e6564617b94675f160a` |
| Vercel project | Existing `ktob-web-front`; pre-V3 READY deployment `dpl_GQ2WRgNLd8iPMbtqGNvPbuSFDWV8` at the same baseline |
| Supabase project | `afavrsrffoyctyvvpxcv`; Sprint 1 and V2 migrations already applied |

## Staged release evidence

| Stage | Current evidence |
|---|---|
| Star defect diagnosis | Production computed styles showed a solid 1px outline on each SVG `path.outline`, matching the visible rectangular artifacts. The generic class collided with Tailwind's outline utility. |
| Star source repair | Replaced generic SVG path classes with component-specific names, preserving clipping and focus styles. Regression injects the actual conflicting Tailwind outline rule: it fails against old names and passes with scoped names. |
| Star local validation | The release operator recorded 90 Angular tests passing and a successful production build before the star-only snapshot was frozen. Independent review confirmed the two-file change preserved geometry, clipping, keyboard behavior and focus styles. Production repair verification remains pending. |
| V2 authenticated acceptance | **Passed in the actual production browser on isolated QA data:** sign-in; Open Library search for *The Time Machine* by H. G. Wells (20 real results); add/detail; start, pause, resume, finish; save 4.5/reload, save 5/reload, clear/reload, restore 4.5; create review/reflection/note; edit note/reload; delete only the disposable note while other two remained; favorite/unfavorite; archive read-only with rating/two notes retained; restore. Diary showed one book/finished/rated record, average 4.5 and one finished in 2026. Live two-account privacy remains unexecuted; automated cross-reader tests are separate evidence. No credentials or QA identifiers are recorded here. |
| V3 backend tests | **66 passed, zero failures/errors/skips** in the final local Maven verify run reported by the backend implementer. Disposable PostgreSQL replayed V1→V2→V3. The 12 advisor database tests cover reader isolation, consent revocation, atomic rollback, idempotency, archive independence and actual restricted-role privileges. Independent source/migration review approved. |
| V3 frontend tests | **111 tests in 15 files passed** in the final V3 run reported by the frontend implementer, followed by a successful production build (324.38 kB initial bundle; existing 8 kB component limits preserved). Review follow-ups cover actionable oversized-context errors, retry cooldown and precise privacy/retry copy. Independent source review approved. No browser visual acceptance is inferred from these tests. |
| GitHub PRs and CI | Star-only **PR #6 merged** after all five checks and Vercel preview passed; merge commit `6a6a04b`. V3 publication and CI remain pending. |
| Documentation and UML | OpenAPI sync, architecture validation, handoff/link validation and repository hygiene passed locally. All 16 PlantUML diagrams checked and rendered with pinned PlantUML 1.2025.4, without error markers. |
| Supabase V3 | `V3__private_conversations.sql` independently reviewed and tested on disposable PostgreSQL; not yet applied to production. Reviewed SHA-256: `153171ab78d8e7e15708cbd3b85fc828eeb4ebc5b5bbb73dc5e7b0331665c5c5` (4,449 bytes). |
| Render V3 | Pending migration and backend release. |
| Vercel V3 | Pending advisor frontend release. |
| Real Groq inference | Not yet performed. Stub responses do not establish live provider success. |

## V3 behavior and boundaries

The release uses six existing designed operations: `GET/PATCH /me/privacy`, `GET/POST /conversations`, and `GET/POST /conversations/{conversationId}/messages`. It adds no new endpoint inventory and preserves the 57-operation R1 design. The source register now contains **26 implemented operations and 31 planned**, with final test results and deployment evidence tracked separately in this record.

General conversations and book conversations are directly reader-owned. `GENERAL` has no work ID; `BOOK_MAIN` requires a visible canonical work. Titles are nonblank and at most 160 characters, or generated locally when omitted/null. Conversations reference a work, not a library entry: archiving a library book preserves and does not disable its independently owned discussion. No library row is held locked during external inference.

Messages use the existing `ConversationTurn` response with real reader/assistant messages, the effective spoiler level, and `proposalIds=[]`. V3 does not implement recommendations, memory proposals, approved memories, profile content-boundary management, conversation deletion, or full account deletion. Conversations remain saved privately in KTOB; provider ZDR does not mean KTOB stores no chat history.

### Consent and spoiler safeguards

- `aiProcessingOptIn` is false by default and rechecked from current database state immediately before dispatch. Missing consent yields `403 AI_PROCESSING_CONSENT_REQUIRED`, with no provider request or committed turn.
- Personalization and its four scopes remain independent false-default flags. V3 reads **no stored journal, reading history, reader profile, preferences or memories for AI context**, even when those flags are true. `MessageWrite` does not accept a `usePersonalContext` field.
- Only the submitted question, minimal selected-book title/author/language and permitted history from that same conversation enter context. KTOB does not automatically add an account email or verified identity; readers should avoid typing sensitive information they do not want processed.
- Each request defaults to `NO_SPOILERS`. `FULL_BOOK_SPOILERS` requires `fullBookSpoilersConfirmed=true` in that exact request. Inconsistent pairs yield `422 SPOILER_CONFIRMATION_REQUIRED`. Both messages of prior full-spoiler turns are excluded from a later no-spoiler context.
- The assistant is instructed to distinguish interpretation from fact, avoid invented quotations or source claims, and acknowledge that it has no full book text unless the reader supplies an excerpt. Spoiler avoidance and literary accuracy remain best effort.
- Revocation stops future dispatch; it cannot undo an already sent request and does not erase stored KTOB conversations.

### Provider and reliability limits

The fixed server-side endpoint is `https://api.groq.com/openai/v1/chat/completions`, with model `openai/gpt-oss-120b`. The backend reads `GROQ_API_KEY` internally; no key value, prefix, hash or length belongs in tools, logs, frontend configuration or this record.

The operator-controlled non-secret setting `KTOB_GROQ_QUALIFIED` defaults false. The credential and confirmed qualification must both be present before the adapter is available. The owner does not need to create a separate `AI_ENABLED` variable. A missing key or incomplete qualification fails closed with a sanitized `503`.

The selected request contract allows up to 12,000 characters, but provider context has a separate **6,000 UTF-8 byte** aggregate budget. A required question/metadata/instruction set that exceeds it yields `422 AI_CONTEXT_TOO_LARGE`; the question is not silently shortened. At most four complete eligible prior turns are added while they fit. Output is capped at 1,024 completion tokens including reasoning, with low reasoning effort and no reasoning returned to the reader.

One inference per Java instance is admitted at a time, before taking a database connection. Other attempts fail promptly with a retryable `429`; they do not consume the entire connection pool. The client uses a 3-second connection timeout, 30-second total inference bound, no redirects, no automatic retries, and a bounded response body. Provider errors, malformed/empty/reasoning-only responses and incomplete completions do not become successful saved turns. Busy/quota responses expose a bounded `Retry-After` header to the exact allowed browser origin.

Authenticated acceptance can use the optional, temporary `KTOB_QA_WEB_ORIGIN` setting without reading or replacing `ALLOWED_WEB_ORIGINS`. It accepts one exact HTTPS deployment origin under `*.vercel.app`, with no wildcard, user information, port, path, query or fragment; other previews are not allowed and credentials mode remains off. Syntax validation does not establish ownership: the release operator must verify that exact deployment belongs to the existing KTOB Vercel project, then clear the setting after preview acceptance.

Reader and assistant messages are committed together only after a valid provider reply. Strictly increasing timestamps preserve their order through pagination. A UUID `Idempotency-Key` binds reader, conversation and the canonical question/spoiler request: exact replay returns the original pair, changed payload returns `409 IDEMPOTENCY_KEY_REUSED`. Retry records contain hashes and message IDs, not duplicate prompt bodies, and are retained with the conversation for at least 24 hours. Provider failure commits neither a partial turn nor a successful replay record.

### Provider qualification evidence

The owner reports a created GroqCloud account/key, visible GPT-OSS 120B, and **Global Zero Data Retention enabled**. These are owner-supplied account-control facts. They supersede the V2 research-only state; they do not establish a successful KTOB inference or account-specific quota by themselves.

Before enabling the production advisor, record secret-presence metadata without the value, actual model response, non-sensitive English/French/Arabic test outcomes, sanitized latency/quota headers and deployment health. The adapter's startup diagnostics may report only credential-present and qualification booleans; successful inference diagnostics may report model, elapsed time and numeric quota limits. No prompt, answer, token or provider error body is logged.

Groq's [data documentation](https://console.groq.com/docs/your-data) distinguishes inference-content controls from operational metadata and limited legal/security exceptions. Its [rate-limit documentation](https://console.groq.com/docs/rate-limits) and the actual account/response headers govern available capacity. No paid tier, paid model fallback or guaranteed availability is part of this release.

The official [reasoning guide](https://console.groq.com/docs/reasoning) was rechecked during review: GPT-OSS supports low/medium/high effort and uses `include_reasoning=false` to omit reasoning from returned content; it does not support `reasoning_format`. The current [data controls documentation](https://console.groq.com/docs/your-data) says all customers may enable ZDR, which disables retention for reliability/abuse monitoring and features requiring retained application state. Usage metadata remains separate. This verifies the integration's documented parameter/control model, not the owner's live account state.

## Additive migration and rollback

V3 creates `app.conversations`, `app.conversation_messages`, and `app.message_idempotency`, with owner references, kind/work consistency, role/spoiler confirmation constraints, message bounds, pagination indexes and idempotency references. It does not update/delete existing rows, change existing opt-ins, or introduce destructive cascades.

New tables revoke access from PUBLIC and available Supabase browser roles. The restricted runtime role receives SELECT/INSERT on the new tables and only column-scoped `UPDATE(title)` on conversations to permit `SELECT FOR UPDATE`. It receives no DELETE or schema-creation permission. RLS is not substituted for Java ownership checks; this release preserves the existing private-schema privilege model.

Before production application, validate V1→V2→V3 on disposable PostgreSQL, inspect the target ledger/schema/grants/indexes/locks and recovery options, and apply reviewed SQL with bounded lock/statement timeouts through the existing Supabase migration mechanism. Keep production automatic Flyway migration disabled. Afterward, verify the new ledger entry, constraints, indexes, effective privileges and unchanged existing-table counts/content fingerprints without retrieving private row contents.

The release operator follows this sequence:

1. Confirm the exact Supabase project and existing V1/V2 migration ledger. Recompute the reviewed V3 file hash. If any V3 table or ledger entry already exists, reconcile that state before applying anything again.
2. Inspect metadata for the referenced reader/work tables and the existing `ktob_app`/browser roles. Record existing table counts and database-computed aggregate content fingerprints; do not return row bodies, identities, journal text, credentials or tokens.
3. Confirm no conflicting long transaction/DDL lock and identify available recovery options. Do not claim a tested full backup or point-in-time restore without evidence. Record the current Render/Vercel versions as application rollback targets.
4. Use the migration identity and transactional migration mechanism to apply the exact reviewed SQL with a 5-second lock timeout and 60-second statement timeout. Abort on an error or drift; do not reset the database or patch existing private rows.
5. Verify the recorded migration, all three tables, constraints and indexes. Confirm PUBLIC/browser denial, `ktob_app` SELECT/INSERT and only conversation-title UPDATE, no new DELETE/schema permissions, and equality of the pre/post existing-table counts and fingerprints.
6. Deploy the CI-verified backend with automatic Flyway still disabled. Check health, authentication and consent-off behavior before qualified live inference. Preserve every additive table and reader message if application rollback is necessary.

Rollback restores recorded application deployments while retaining additive V3 tables and reader messages. Do not drop chats, reset the schema or restore an older database over newer reader data. Full backup export/restore testing must be recorded separately; it is not implied by this additive migration procedure.

## Demonstration: six to eight minutes

1. Introduce KTOB as a private space for books, reading experiences and reflections; sign in.
2. Discover a real work through Open Library, check title/author/provenance, and add it to the library.
3. Log an explicitly finished historical reading and save a **4.5-star** rating with five clean stars.
4. Save a short private review, then refresh to demonstrate database persistence.
5. Open the reading diary and show real saved history and statistics.
6. Choose **Discuss this book**. Explain what is sent to Groq and explicitly enable AI processing if desired; keep personalization off.
7. Ask: “Without plot spoilers, ask me one thoughtful question about the narrator's perspective.” Show a real saved response only after live inference has passed.
8. Show the per-question spoiler control and consent revocation. Explain that the Java backend enforces the same rules.
9. Explain Angular on Vercel → Java REST on Render → private PostgreSQL in Supabase. Java also consumes Open Library and, with consent, Groq. These are logical modules in one Java runtime, not separate microservice deployments.

### Reliable fallback

If Groq is unavailable or rate-limited, keep the honest unavailable state and continue with the saved reading/journal/diary demonstration. Open Library already provides the required Java-to-external-web-service SOA proof. If discovery is unavailable, use a previously saved real work and explain that fallback without claiming a fresh provider call. Preserve drafts after recoverable failures and avoid repeated sends while a request is in progress.

## Completion checklist

Record actual results for star views at desktop/tablet/mobile widths, keyboard focus, 4.5/5/clear persistence, lifecycle transitions, review/reflection/note create/edit/delete, favorite/unfavorite, diary, archive/restore, and two-reader isolation. Separately record backend/frontend tests, CI, migration, exact deployment IDs, consent-off zero-dispatch, provider failures, idempotent replay, full-to-no-spoiler history filtering and real English/French/Arabic inference. Passing mocks or build checks do not establish browser or live-provider acceptance.
