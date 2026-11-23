# KTOB reading journal release and SOA demonstration

Demo: **Tuesday, 24 November 2026**, Tunisia time.

## Release scope and evidence

The prepared release expands the existing authenticated library into a private reading journal: separate reading experiences, half-star ratings, reviews/reflections/quotes/notes/emotions, favorites, book details and a diary. Each reread has its own rating and journal. AI remains a separate provider qualification gate; the main demonstration does not require it.

**Current release status: AUTHORIZED; PUBLICATION AND DEPLOYMENT IN PROGRESS.** The owner explicitly authorized publishing the prepared changes, merging PRs after CI, applying the reviewed additive V2 migration after safety checks, and deploying to the existing services. This resolves the earlier automatic approval rejection. The evidence table below separates completed local verification from pending production actions.

The repository's [implemented operations](implemented-operations.json) lists implemented Java routes. It does not prove that a migration or deployment has been applied. The complete OpenAPI design still contains 57 operations, including planned features.

**Release order:** Release A contains the additive database change and tested Java APIs. Release B contains the Angular book/journal/diary views and follows successful backend deployment. The first backend PR does not make the new UI available. The walkthrough below is the acceptance sequence for the integrated release, and should be presented only after Release B is verified.

| Item | Evidence / status |
|---|---|
| Baseline main | `65044662983b5750914abea53d2a583ae275d29b` |
| Production web | https://ktob-web-front.vercel.app |
| Production API | https://ktob-api.onrender.com/api/v1/health |
| Repository | https://github.com/Adam-BArbia/ktob-literary-companion |
| Target Render service | `ktob-api`, service `srv-dc29h8ou01pc73fvujs0`, **adam's workspace** |
| Existing Render baseline deployment | `dep-dc2bogfb9u1s73cn94dg`, source `65044662983b5750914abea53d2a583ae275d29b`; observed before this release, not a new deployment. |
| Existing Vercel baseline deployment | `dpl_wG9vdgrY7prKR9m8anmohPaLPXDS`; observed before this release, not a new deployment. |
| Target Supabase project | KTOB, `afavrsrffoyctyvvpxcv` |
| New migration | `V2__reading_experiences_and_journal.sql`; verified with V1 against disposable PostgreSQL 17.12, seven application tables, browser-access denial and restricted-role checks. **Production application unexecuted.** |
| Backend local validation | Final Maven `verify` passed: **41 tests, zero failures/errors/skips**. The reading/journal release first passed 37 tests, including 11 new HTTP + PostgreSQL integration tests and five new unit tests; the discovery follow-up added three PostgreSQL + HTTP-stub integration tests and one provider result-bound test. Runnable Java application jar built. |
| Frontend local validation | **89 tests across 12 files passed**; Angular production build passed with a **324.12 kB initial bundle** and the existing 8 kB component-style hard limits unchanged. Includes deterministic SVG half-star geometry coverage. This is not deployed UI or browser visual verification. |
| Implemented API operations | **20 of 57**: previous 11 plus library PATCH, four Reading operations and four Journal operations. Registry and actual controller mappings agree. |
| GitHub release branch / commit / PR | Authorized; publication pending. Baseline SHA above is the existing production source, not a new release SHA. |
| GitHub CI for this release | **Unexecuted:** local passing tests are not a remote CI result. |
| Render backend release | **Unexecuted:** no new deployment ID. |
| Vercel preview / production release | **Unexecuted:** no new preview URL or deployment ID. The production URL above remains the existing release. |
| Live API smoke / real two-account verification of new operations | **Unexecuted:** script prepared for after backend deployment. |
| Deployed UI / browser refresh verification of new features | **Unexecuted:** requires frontend release after backend verification. |
| Discovery ranking follow-up | Implemented and included in the final 41-test backend run. Preserves current provider order, stably promotes normalized exact titles, keeps adaptations, deduplicates canonical work IDs, and bounds accepted provider results. Private manual matches remain reader-scoped. Independent source review found no ordering, privacy or result-count blocker. **Not deployed.** |
| Real AI inference | Not verified; do not demonstrate or claim live AI without a qualified provider and actual successful inference |

### Migration history and production guard

The existing production schema is tracked by the Supabase migration ledger, with `20261123204102_reader_catalog_library_sprint1` and `20261123204134_ktob_app_least_privilege_runtime_grants`. There is no production Flyway history table. Local and CI databases replay the repository's Flyway V1/V2 files; hosted changes are reviewed SQL recorded in the existing Supabase ledger. Do not create a competing production history or enable `KTOB_AUTO_MIGRATE=true`.

Apply the additive reading/journal SQL to the verified KTOB project before deploying code that queries the new tables. Recheck tables, constraints, indexes, restricted runtime grants and browser denial after application. Existing library/profile/catalog rows are retained. A deployment rollback should restore the prior application version while retaining the additive tables and any new reader material; it should not drop journals or reset the schema.

### Recovery review and remaining preflight evidence

Static review of the exact V2 SQL finds no modification or removal of existing reader rows. Its only existing-table change adds `UNIQUE(id,work_id)` to `library_entries`; existing uniqueness of the primary-key `id` already guarantees those pairs are unique. The migration otherwise creates two tables, their indexes/constraints, and permissions on those new tables. Creating the additional unique constraint still requires a database lock, so inspect current table size and blocking transactions before application.

The safe application rollback is to return Render and Vercel to their recorded prior deployment versions while **keeping V2 tables and all reader material**. Baseline Java source `65044662983b5750914abea53d2a583ae275d29b` does not query the new tables; its existing schema queries remain compatible. This compatibility was reviewed in source, not tested as a deployed rollback. Keep production `KTOB_AUTO_MIGRATE=false`. Earlier code temporarily cannot display the new reading/journal features, but it does not erase their data.

For a migration or transport failure, inspect both the Supabase ledger and actual schema before retrying. Do not assume a timeout means nothing committed, and do not rerun an applied V2. Confirm that the chosen migration mechanism applies the SQL and records its ledger entry atomically. If a later correction is needed, create a separate reviewed migration and fix the specific constraint, permission or application behavior while retaining existing rows. Do not use DROP, schema reset, destructive rollback or an older whole-database restore as the normal release rollback.

An actual restorable production backup has **not** been verified. Supabase's [backup documentation](https://supabase.com/docs/guides/platform/backups) recommends manual exports for Free projects; automated recovery must not be assumed from the existence of the hosted database. A migration-safety backup should capture the private application schema/data, relevant grants and existing migration history using an authorized connection, remain private, and be restore-tested in a separate disposable database. An application-only dump is not a complete Supabase Auth/account backup. Do not publish reader data or backup contents in GitHub or demo artifacts.

Before production application, record the current target/schema/ledger state and table sizes; verify lock/statement-timeout and transaction behavior for the selected migration path; confirm the actual backup/recovery option; reconfirm the existing Render and Vercel baseline deployment IDs recorded above; and verify that the runtime role, private-schema exposure and automatic-migration setting still match the reviewed configuration. The additive change and local tests reduce migration risk, but do not replace these production checks.

### Documentation validation completed locally

- `python docs/architecture/validate_contract.py`: passed, 16 UML sources / 57 designed operations / 47 schemas.
- `python docs/implementation/validate_handoff.py`: passed, all 57 operation assignments and local document links.
- Workflow-pinned PlantUML 1.2025.4: syntax validation passed; all 16 diagrams rendered to SVG without renderer errors.

Java and Angular local validation are recorded separately in the evidence table above. Remote CI, deployment and live acceptance checks remain unexecuted and must receive their own evidence before the release is called complete.

The completed Java run used disposable PostgreSQL 17.12 with `KTOB_TEST_POSTGRES=true`, `KTOB_AUTO_MIGRATE=true` **only for that disposable database**, and a local test JDBC configuration. The integration tests use Spring Security's test JWT context; they do not prove a real Supabase token or deployed production workflow. The live smoke check below verifies that separate boundary after release.

### Repeatable live API smoke check

`scripts/smoke_reading_journal.py` uses Python's standard library and accepts only these environment variables:

- `API_BASE_URL`: the verified deployment URL ending in `/api/v1`.
- `QA_READER_A_TOKEN` and `QA_READER_B_TOKEN`: valid access tokens for **two distinct, owner-authorized, isolated test accounts** in the KTOB Supabase project. Obtain them through the normal test-user authentication flow and provide them securely in the process environment. Do not paste credentials into this document, shell history or logs.

After the additive migration and backend deployment are verified, run:

```sh
python3 scripts/smoke_reading_journal.py
```

The script creates one uniquely labelled private manual QA work and library entry, and then operates only on that entry and its newly created readings/journal. It verifies saved ratings (4.5, 5, null), journal independence, favorites, lifecycle rules, all nine new operations' anonymous/foreign-owner guards, and archive/restore behavior. It archives its own entry in a `finally` cleanup; it does not delete accounts, purge journals or touch preexisting books. The new private catalog work and archived reading history are retained in the isolated QA account.

Output contains sanitized PASS/FAIL labels and one JSON result with fixture UUIDs and archive status. It never prints tokens, note text, raw response bodies or server exception details. No write is automatically retried and redirects are refused to prevent forwarding bearer credentials. A nonzero exit or `entryArchived=false` requires inspection of the reported fixture ID. Independent HTTP GETs establish API persistence; actual browser refresh and UI interactions still require separate verification after Release B.

## Before the demonstration

1. Open the deployed web page and API health URL early enough to recover from a cold start. A green health response establishes liveness; sign-in and one library read establish database/auth readiness.
2. Use an existing demo account with reader-authored content that is suitable for sharing. Have a separate second account ready for the privacy check.
3. Choose a real book the presenter has read. Check the title **and author** in Open Library results; similarly titled adaptations are legitimate separate results.
4. Prepare a short review and reflection in advance. A quotation must be an actual passage supplied and checked by the presenter; do not invent a quote or attribute a paraphrase as verbatim text.
5. Confirm the exact production build supports all steps below. Keep an already saved book available in case external discovery is temporarily unavailable.

## Main walkthrough: about six minutes

| Step | Action | What to explain or verify |
|---|---|---|
| 1 | Open KTOB and sign in | “KTOB keeps my books and my thoughts about each reading together in a private space.” |
| 2 | Search for a real title in Discover | Angular sends the request to the Java API. Java calls Open Library and returns source-attributed metadata. |
| 3 | Add a result and open its detail page | The new library entry initially shows Want to read. Saving a book does not pretend it has been read. The decorative cover is original KTOB artwork. |
| 4 | Log a finished reading, select **4.5 stars**, and save | This is an explicit historical finished read. The score belongs to this reading experience. Use a known date, or leave the date blank. |
| 5 | Write and save a short review, then a separate reflection or verified quotation | Each is a private journal entry. Personalization permission starts off; saving does not authorize external AI processing. |
| 6 | Refresh the browser | The rating and both journal entries must remain. This demonstrates server persistence rather than component or localStorage state. |
| 7 | Edit the rating to **5 stars** and edit the review | Save and refresh again. Review editing must not overwrite the rating or another journal entry. |
| 8 | Mark the book as a favorite and open the diary | Show the stored favorite, actual reading record and truthful statistics. Missing reading dates remain unknown. |
| 9 | Start a reread, pause and resume it | A new experience preserves the previous rating and notes. Only one open experience is permitted. |
| 10 | Archive and restore the book | Archive preserves history. Historical content remains readable, while edits require restoration. |
| 11 | Switch to the second account | The first account's private book/reading/journal is absent. Opening the original detail URL must not reveal it. |

For a shorter demonstration, stop after step 8 and give the architecture explanation below. Keep reread/archive/privacy as prepared follow-up checks.

## Optional AI demonstration

Only show this if the release evidence records a qualified provider, a configured server-side credential, valid consent controls and a successful real inference request. Processing and personalization permissions are separate. Start with no spoilers, use only the presenter's typed question plus title/author metadata, and never assume personal notes are included. Explain that literary observations can be incomplete or incorrect and spoiler avoidance is best effort.

If AI is unavailable, show its honest unavailable state briefly and continue with ratings, journal and diary. Do not display scripts or test fixtures as model output.

### Provider qualification result for this release

**Gate B16 remains unmet. No real inference was performed, and no live AI adapter is claimed.** The existing honest unavailable interface remains the appropriate product state.

Groq's [production models](https://console.groq.com/docs/models) include `openai/gpt-oss-20b` and `openai/gpt-oss-120b`. Its [published free-plan limits](https://console.groq.com/docs/rate-limits) list 30 requests/minute, 1,000 requests/day, 8,000 tokens/minute and 200,000 tokens/day for these models; the actual account/organization quota remains authoritative. The [billing FAQ](https://console.groq.com/docs/billing-faqs) describes adding a payment method when upgrading to Developer. These references make Groq a candidate, not evidence that this account has working access.

Groq's [data-handling documentation](https://console.groq.com/docs/your-data) states that inference data is not retained by default except for reliability/abuse cases, which may retain data for up to 30 days, and describes an available zero-data-retention control. The release has **not** verified a user Groq account, API key, actual access from Tunisia, account-specific quota, inference latency, or the account's retention configuration. Those missing checks prevent enabling AI. No conclusion about legal compliance is inferred from the public documentation.

Before a later live AI release: verify the intended account/model/access/quota and retention settings, configure a server-only secret directly in Render, implement and test the consent/spoiler boundaries, and complete a real request. Personal journals remain excluded unless every applicable permission is explicitly satisfied.

## Fallbacks

| Failure | Reliable next action |
|---|---|
| Optional AI unavailable | Continue with the complete reading-journal sequence. The SOA external-service requirement is demonstrated by Open Library. |
| Discovery provider unavailable | Use a previously saved real book for the journal sequence, or create a private manual book. Explain that manual creation is a fallback; it does not prove a new external-service call. |
| API cold start / network error | Keep typed text, wait for readiness and retry. Do not submit repeatedly while a request is still pending. |
| New release not deployed | Demonstrate only the functionality actually present on production. A preview or passing unit test is not production evidence. |

## SOA explanation

> The browser consumes our Java REST service. Java owns authentication checks, reading rules and data access. Java also consumes the free Open Library web service for book discovery. PostgreSQL stores each reader's library and journal. Those two service-consumption paths meet the project's reported REST-based SOA requirement.

| Technology | Role and reason |
|---|---|
| Angular / TypeScript | A typed, component-based browser application with routes, forms and an HTTP client; handles interaction and renders API data. |
| Spring Boot / Java 21 | The project's Java web service. Enforces reading transitions, validation, ownership and external-provider boundaries in one deployable application. |
| Supabase Auth | Registration, sign-in and user access tokens. Java verifies the token and takes the reader identity from it. |
| Supabase PostgreSQL | Relational persistence and constraints. Private `app` tables are accessed by Java with a restricted role, not through privileged browser access. |
| Render | Runs the Java application as a Docker web service. The current configured service is on a free plan, so the demo should be checked for cold starts. |
| Vercel | Hosts the compiled Angular application separately from Java. |
| Open Library | Real external metadata service consumed from Java; preserves title/author/source information and supports a manual-entry fallback when unavailable. |

The Java modules are parts of a single runtime; do not describe them as independently deployed microservices.

## Validation checklist and evidence rules

Record actual command results and deployment IDs before checking a release complete.

- Java compilation and existing/new unit tests.
- Disposable PostgreSQL migration and API integration tests, including real constraints and restricted grants.
- Angular production build and component/service tests.
- Contract schema, implemented-operation mapping, handoff links, repository hygiene and all 16 UML parser/render checks.
- Rating `1`, `4.5`, `5`, clear/null; reject `0.5`, `4.2`, `5.5`, strings and explicit invalid null fields.
- HistoricalImport requirement; one open CURRENTLY_READING/PAUSED; terminal status cannot reopen; metadata and progress remain independent.
- Journal create/read/edit/delete; 20,000-character body limit, 12 tags maximum and 40-character tag limit; no lost draft on network failure.
- Anonymous `401`; foreign owner `404`; owned archived mutations `409 LIBRARY_ENTRY_ARCHIVED`; owner archived GET succeeds.
- Database grants prohibit browser-role access; all child writes serialize with library archive and preserve ownership.
- Actual desktop/mobile viewport and keyboard checks, refresh persistence and two-account verification.
- AI provider status recorded separately; no provider dispatch without the required qualification and consent.

Never put access tokens, passwords, private journals or provider keys in release notes, screenshots, repository files or logs.
