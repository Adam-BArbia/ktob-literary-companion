# KTOB V3 — literary companion release and demonstration

**Release date:** 24 November 2026, Tunisia time. **Status: frontend, backend and additive migration deployed; recorded preview and production browser acceptance passed. Temporary preview access was removed, and final deployment/HTTP/CORS verification passed.** This record distinguishes completed observations from verification that was not performed. The [V2 release record](overnight-release-demo.md) remains the historical evidence for the reading-journal release.

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
| Star local validation | The release operator recorded 90 Angular tests passing and a successful production build before the star-only snapshot was frozen. Independent review confirmed the two-file change preserved geometry, clipping, keyboard behavior and focus styles. |
| Star production acceptance | **Passed** on READY Vercel deployment `dpl_2sfh8Qq6Wzt1gFLETMzxVvdtosmz` at `6a6a04b`: editable/read-only SVG paths had `outline-style:none`; 4.5 rendered correctly; native keyboard focus retained a solid 3px indicator only on the focus target. Browser zoom produced CSS widths 1,363 / 779 / 340 with no horizontal overflow and correct full/half-star display. The finished-reading form's 4.5 view was inspected and canceled. Device emulation was blocked by organization policy, so this is responsive browser evidence, not device or mobile-touch testing. |
| V2 authenticated acceptance | **Passed in the actual production browser on isolated QA data:** sign-in; Open Library search for *The Time Machine* by H. G. Wells (20 real results); add/detail; start, pause, resume, finish; save 4.5/reload, save 5/reload, clear/reload, restore 4.5; create review/reflection/note; edit note/reload; delete only the disposable note while other two remained; favorite/unfavorite; archive read-only with rating/two notes retained; restore. Diary showed one book/finished/rated record, average 4.5 and one finished in 2026. Live two-account privacy remains unexecuted; automated cross-reader tests are separate evidence. No credentials or QA identifiers are recorded here. |
| V3 backend tests | **66 passed, zero failures/errors/skips** in the final local Maven verify run reported by the backend implementer. Disposable PostgreSQL replayed V1→V2→V3. The 12 advisor database tests cover reader isolation, consent revocation, atomic rollback, idempotency, archive independence and actual restricted-role privileges. Independent source/migration review approved. |
| V3 frontend tests | **125 tests in 15 files passed** in the final V3 run reported by the frontend implementer, followed by a successful production build (325.78 kB initial / 87.86 kB estimated transfer; existing 8 kB component limits preserved). Review follow-ups cover actionable oversized-context errors, retry cooldown, precise privacy/retry copy and 14 session-boundary regressions. Independent source review approved. No browser visual acceptance is inferred from these tests. |
| GitHub PRs and CI | Star-only **PR #6 merged** after all five checks and Vercel preview passed; merge commit `6a6a04b`. Backend/docs **PR #7 merged** after nine successful checks plus Vercel; merge commit `508cf5ebd0a025532781d21bc7b86e8b02188087`. Frontend **PR #8 merged** with the expected head after all five check runs and Vercel status succeeded; merge commit `b52e291eb7ce072bbe42b6e7476fe0c227b69f97`. A Maven dependency-download failure in the push run was resolved by rerunning only the failed job: run `45294456706`, job `138113799613`, passed at 00:13:39 UTC. |
| Documentation and UML | OpenAPI sync, architecture validation, handoff/link validation and repository hygiene passed locally. All 16 PlantUML diagrams checked and rendered with pinned PlantUML 1.2025.4, without error markers. |
| Supabase V3 | **Applied and verified** as `private_conversations_v3`, version `20261124000453`, after target/ledger/role/lock checks. The reviewed SHA-256 remained `153171ab78d8e7e15708cbd3b85fc828eeb4ebc5b5bbb73dc5e7b0331665c5c5` (4,449 bytes). Postchecks found three new empty tables, 20 validated constraints and 11 indexes; effective grants matched review. Counts and aggregate content fingerprints for every existing application table were unchanged. No private row content was retrieved for these checks. |
| Render V3 | **Final cleanup deployment LIVE at 00:22:00 UTC:** `dep-dc2dgi4s728c73a8v9pg`, source `b52e291eb7ce072bbe42b6e7476fe0c227b69f97`. The earlier qualified deployment was `dep-dc2dcqk0916s739p01j0`. Final startup at 00:21:45 UTC reported only `keyConfigured=true` and `qualificationConfirmed=true`; no key value or derived secret information was retrieved. Only `KTOB_QA_WEB_ORIGIN` was cleared through a merge environment update; the existing origin list was preserved and automatic migration remained disabled. |
| Final HTTP and CORS | **Passed:** health `200 {"status":"ok"}`; anonymous conversations `401`; production preflight `200` with the exact allowed origin and Authorization / Content-Type / Idempotency-Key allowed, Retry-After exposed, and credentials mode off. Both the removed preview origin and an unrelated origin returned `403` without an allow-origin header. |
| Vercel V3 | **Production READY**, deployment `dpl_GhTM8dsdCDjyT6ts9CCdYn35Rj8Q`, verified in the existing project at `b52e291eb7ce072bbe42b6e7476fe0c227b69f97`. PR #8 preview at head `2c0da4` had passed acceptance before merge. Production reload preserved the authenticated session, saved V2 reading/rating/journal data, the Discuss action, saved-off consent and both conversation histories. |
| Real Groq inference | **Seven live inference successes** across preview and production. Preview English/French/Arabic replies persisted after reload; Arabic computed text direction was RTL. A real French book response from the production frontend succeeded at 00:20:01 UTC, then persisted after reload. Sanitized diagnostics identified `openai/gpt-oss-120b`; observed adapter elapsed times were 2,580 / 608 / 477 ms for the language samples and 539 ms for the production sample, with numeric `requestLimit=1000`, `tokenLimit=8000` fields. These are individual samples, not end-to-end latency or capacity guarantees; no quota time window is inferred from those field names. |
| Production regression and privacy | Saved book history and collapsed full-spoiler disclosures restored after reload. Explicit QA consent revocation persisted off after reload; history remained readable. Diary state and the 4.5 rating remained intact, and a fresh production Open Library search returned 20 real results. The planned single-reader browser acceptance and final backend cleanup checks are complete. |
| Bounded provider-log inspection | Inspection of sanitized provider diagnostics from 00:13 UTC through the final check found zero matches for the known safe failure, interrupt and non-2xx log prefixes. This is a bounded check of those prefixes, not a claim that all application logs were examined or that no other errors occurred. |

### Completed preview/production acceptance and remaining limits

| Check | Observed result |
|---|---|
| Provider disabled before qualification | A general-conversation attempt produced a sanitized unavailable error and retained the draft. Database checks confirmed no saved messages or successful idempotency result for that attempt. |
| English / French / Arabic | Real replies received; all three survived reload. Arabic computed text direction was RTL. |
| Book discussion context | **Passed:** a question that did not name the book identified *The Time Machine* / H. G. Wells from selected metadata and provided an opening theme. No saved journal content was needed for this check. |
| Explicit full-spoiler controls | **Passed:** an unconfirmed attempt displayed validation and preserved the draft; the Send button remained enabled, while validation blocked submission. Confirmed submission saved a real reader/assistant pair, each behind a separate collapsed spoiler disclosure. Full-spoiler permission reset off during the request and remained off afterward. |
| Full-to-no-spoiler downgrade | **Passed for the observed turn:** the next no-spoiler reply stayed within opening discussion. The prior full-spoiler reader/assistant disclosures remained collapsed after reload. Automated tests separately verify that both messages of prior full-spoiler turns are excluded from provider context. |
| Saved consent and revocation | **Passed:** revocation saved processing consent off, disabled Send with a populated draft, and remained off after reload. Saved history remained readable. Automated tests separately prove consent-off zero-call and revocation-race enforcement in Java. |
| Atomic saved turns | Database aggregates matched the confirmed reader/assistant pairs and their successful idempotency records in both conversations, including exactly one full-spoiler pair in the book discussion. No QA identity or conversation/message identifiers are recorded here. |
| Live two-reader isolation | Not executed; disposable database tests cover owner isolation. |
| Production advisor promotion | **Passed:** deployment READY, real production response and reload persistence, restored spoiler disclosures, saved-off consent, diary/rating persistence and fresh external catalog search. Final Render cleanup is LIVE and HTTP/CORS checks passed after temporary preview access was removed. |

The operator flagged a questionable incidental plot detail in one real book response. This run establishes working contextual discussion and persistence, not literary factual accuracy. The UI's AI-can-be-mistaken limitation remains necessary; use reader-provided passages for exact close reading and verify facts or quotations independently. No QA prompt or reply text is reproduced here.

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

### Reader-session boundary

Sign-out or a change of reader synchronously invalidates a session revision, destroys the active private page, and replaces the document at the fixed same-origin sign-in/library destination. A canceled Angular draft prompt cannot leave the old reader's page visible. Normal token refresh for the same reader preserves the page and draft.

Each API call binds its starting reader and session revision across token acquisition and response delivery. An identity change cancels pending HTTP reads and rejects queued writes before dispatch; a stale token check or error cannot overwrite the newer session. Already dispatched server work may still finish for its original verified reader, but its response cannot populate another reader's UI. Tests cover sign-out/re-sign-in to the same reader, direct reader changes, stale token/error responses, queued conversation-title/privacy writes and already-received-response races.

### Provider and reliability limits

The fixed server-side endpoint is `https://api.groq.com/openai/v1/chat/completions`, with model `openai/gpt-oss-120b`. The backend reads `GROQ_API_KEY` internally; no key value, prefix, hash or length belongs in tools, logs, frontend configuration or this record.

The operator-controlled non-secret setting `KTOB_GROQ_QUALIFIED` defaults false. The credential and confirmed qualification must both be present before the adapter is available. The owner does not need to create a separate `AI_ENABLED` variable. A missing key or incomplete qualification fails closed with a sanitized `503`.

The selected request contract allows up to 12,000 characters, but provider context has a separate **6,000 UTF-8 byte** aggregate budget. A required question/metadata/instruction set that exceeds it yields `422 AI_CONTEXT_TOO_LARGE`; the question is not silently shortened. At most four complete eligible prior turns are added while they fit. Output is capped at 1,024 completion tokens including reasoning, with low reasoning effort and no reasoning returned to the reader.

One inference per Java instance is admitted at a time, before taking a database connection. Other attempts fail promptly with a retryable `429`; they do not consume the entire connection pool. The client uses a 3-second connection timeout, 30-second total inference bound, no redirects, no automatic retries, and a bounded response body. Provider errors, malformed/empty/reasoning-only responses and incomplete completions do not become successful saved turns. Busy/quota responses expose a bounded `Retry-After` header to the exact allowed browser origin.

Authenticated acceptance can use the optional, temporary `KTOB_QA_WEB_ORIGIN` setting without reading or replacing `ALLOWED_WEB_ORIGINS`. It accepts one exact HTTPS deployment origin under `*.vercel.app`, with no wildcard, user information, port, path, query or fragment; other previews are not allowed and credentials mode remains off. Syntax validation does not establish ownership: the release operator must verify that exact deployment belongs to the existing KTOB Vercel project, then clear the setting after preview acceptance. This release completed that cleanup and verified rejection of the former preview origin.

Reader and assistant messages are committed together only after a valid provider reply. Strictly increasing timestamps preserve their order through pagination. A UUID `Idempotency-Key` binds reader, conversation and the canonical question/spoiler request: exact replay returns the original pair, changed payload returns `409 IDEMPOTENCY_KEY_REUSED`. Retry records contain hashes and message IDs, not duplicate prompt bodies, and are retained with the conversation for at least 24 hours. Provider failure commits neither a partial turn nor a successful replay record.

### Provider qualification evidence

The owner reports a created GroqCloud account/key, visible GPT-OSS 120B, and **Global Zero Data Retention enabled**. These are owner-supplied account-control facts. They supersede the V2 research-only state; they do not establish a successful KTOB inference or account-specific quota by themselves.

The qualified Render deployment subsequently reported only the allowed key-presence/qualification booleans. Controlled preview acceptance produced real English/French/Arabic replies that remained after reload, followed by a real production French book response and saved-off consent verification. The selected model and sanitized adapter latency/quota samples are recorded above. This establishes working inference and persistence for the observed turns; it does not establish a comparative literary benchmark, account-wide capacity or a spoiler guarantee.

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

Completed evidence above covers star display at the recorded browser widths, keyboard focus, 4.5/5/clear persistence, lifecycle transitions, review/reflection/note create/edit/delete, favorite/unfavorite, diary, archive/restore, and preview/production advisor acceptance. Backend/frontend tests, CI, migration, exact deployment IDs and final HTTP/CORS results are recorded separately. Automated tests establish consent-off zero-dispatch, idempotent replay, ownership and full-to-no-spoiler history filtering; observed provider calls establish only their recorded live outcomes.

Live two-reader acceptance, device/mobile-touch testing and a full backup/restore drill were not performed. Automated isolation tests, responsive browser-width checks and additive migration fingerprints do not substitute for those checks. The [review checklist](../architecture/06-review-gates.md) preserves these distinctions.
