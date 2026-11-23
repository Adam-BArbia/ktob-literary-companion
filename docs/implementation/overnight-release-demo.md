# KTOB reading journal release and SOA demonstration

Demo: **Tuesday, 24 November 2026**, Tunisia time.

## Release scope and evidence

The prepared release expands the existing authenticated library into a private reading journal: separate reading experiences, half-star ratings, reviews/reflections/quotes/notes/emotions, favorites, book details and a diary. Each reread has its own rating and journal. AI remains a separate provider qualification gate; the main demonstration does not require it.

**Current release status: DEPLOYED; AUTHENTICATED ACCEPTANCE STILL OUTSTANDING.** The owner explicitly authorized publication, merging after CI, the additive migration after safety checks, and deployment to the existing services. Backend PR #3 and frontend PR #4 passed their checks and were merged. Supabase V2, the Render backend and the Vercel production frontend are deployed. Public API and production-page checks passed. No signed-in reader session was available, so authenticated journal interaction, refresh persistence and live two-account verification remain unexecuted.

The repository's [implemented operations](implemented-operations.json) lists implemented Java routes. It does not prove that a migration or deployment has been applied. The complete OpenAPI design still contains 57 operations, including planned features.

**Release order:** Release A delivered the additive database change, tested Java APIs, and discovery ranking correction. Release B delivered the Angular book/journal/diary views after successful backend deployment. Run the acceptance sequence below with an authorized signed-in reader before presenting the private reading/journal features; the recorded public-page checks do not establish those authenticated results.

| Item | Evidence / status |
|---|---|
| Pre-release main | `65044662983b5750914abea53d2a583ae275d29b` |
| Production web | https://ktob-web-front.vercel.app |
| Production API | https://ktob-api.onrender.com/api/v1/health |
| Repository | https://github.com/Adam-BArbia/ktob-literary-companion |
| Target Render service | `ktob-api`, service `srv-dc29h8ou01pc73fvujs0`, **adam's workspace** |
| Existing Render baseline deployment | `dep-dc2bogfb9u1s73cn94dg`, source `65044662983b5750914abea53d2a583ae275d29b`; observed before this release, not a new deployment. |
| Existing Vercel baseline deployment | `dpl_wG9vdgrY7prKR9m8anmohPaLPXDS`; observed before this release, not a new deployment. |
| Target Supabase project | KTOB, `afavrsrffoyctyvvpxcv` |
| New migration | **Applied successfully** to KTOB as `20261123225716_reading_experiences_and_private_journal_v2`. Payload is the reviewed `V2__reading_experiences_and_journal.sql` with transaction-local 5-second lock and 60-second statement timeouts. Postchecks verified constraints, indexes and new-table grants. |
| Backend local validation | Final Maven `verify` passed: **41 tests, zero failures/errors/skips**. The reading/journal release first passed 37 tests, including 11 new HTTP + PostgreSQL integration tests and five new unit tests; the discovery follow-up added three PostgreSQL + HTTP-stub integration tests and one provider result-bound test. Runnable Java application jar built. |
| Frontend local validation | **89 tests across 12 files passed**; Angular production build passed with a **324.12 kB initial bundle** and the existing 8 kB component-style hard limits unchanged. Includes deterministic SVG half-star geometry coverage. This is not deployed UI or browser visual verification. |
| Implemented API operations | **20 of 57**: previous 11 plus library PATCH, four Reading operations and four Journal operations. Registry and actual controller mappings agree. |
| Backend GitHub PR / commits | [PR #3](https://github.com/Adam-BArbia/ktob-literary-companion/pull/3) **merged** after checks. Reviewed head: `fb3bf8edbde81829136cebb392b0fd7eeb7b6164`. Squash merge on main: `a1f10afb8676188f606aa606a1b1864cfa453aae`. Includes the four discovery follow-up files. |
| GitHub CI for backend release | **All nine check runs successful** on the PR head; separate Vercel status also successful. These checks concern Release A and do not establish deployment of the new Angular views. |
| Render backend release | **LIVE:** `dep-dc2c9t15efls73dhbjlg`, commit `a1f10afb8676188f606aa606a1b1864cfa453aae`; completed 23 November 2026 at `22:59:37.988Z`. |
| Frontend GitHub PR / commits | [PR #4](https://github.com/Adam-BArbia/ktob-literary-companion/pull/4) **merged** after checks. Reviewed head: `5aacdb700f961f78afb8ce474d2a893e37285dbb`. Squash merge on main: `6e5069304ce220f9fcc3e961fddcd85ef21c0cc8`. |
| GitHub CI for frontend release | **All five check runs successful** on the PR head; separate Vercel status successful. |
| New UI Vercel preview | **READY:** `dpl_Gtf2BPhAd1z7wTRoW7SuV551AWw8`, [preview URL](https://ktob-web-front-db50h4wro-fleet-luma.vercel.app). Public pages loaded in the browser. Its origin is intentionally excluded from the production API's CORS allowlist. |
| New UI Vercel production release | **READY:** `dpl_4MBdxm8dThgZDuBUnogpvzx9PqA7`, commit `6e5069304ce220f9fcc3e961fddcd85ef21c0cc8`; [deployment URL](https://ktob-web-front-h1ujo66b4-fleet-luma.vercel.app), production alias https://ktob-web-front.vercel.app. The frontend-only merge did not redeploy the API; its live backend deployment remains the one recorded above. |
| Public live API checks | **Passed:** health GET `200`; all nine new operations returned anonymous `401`; production-origin PATCH preflight returned `200` with the exact allowed origin and required methods. Preview-origin preflight returned the expected `403`; CORS was not broadened. |
| Authenticated API smoke / real two-account verification | **Unexecuted:** no authenticated session was available. The prepared isolated-account smoke script has not been run against production. |
| Public browser checks | Preview homepage/navigation loaded visually and the diary auth-return route worked. Production reload showed the new **Reading diary** navigation, **Service connected**, and a clean homepage. Clicking the production diary link redirected to `https://ktob-web-front.vercel.app/auth?returnUrl=%2Fdiary`. |
| Remaining authenticated UI acceptance | **Unexecuted:** journal interaction, saved-rating/journal refresh persistence and two-account production checks. No signed-in reader session was available; no authenticated success is inferred from public-page checks. |
| Discovery ranking follow-up | Included in the live Render backend and final 41-test backend run. Preserves current provider order, stably promotes normalized exact titles, keeps adaptations, deduplicates canonical work IDs, and bounds accepted provider results. Private manual matches remain reader-scoped. Ordering/privacy/limits passed independent source review and local tests; authenticated live search was not recorded. |
| Real AI inference | Not verified; do not demonstrate or claim live AI without a qualified provider and actual successful inference |

### Migration history and production guard

The production Supabase migration ledger now contains `20261123204102_reader_catalog_library_sprint1`, `20261123204134_ktob_app_least_privilege_runtime_grants`, and the applied `20261123225716_reading_experiences_and_private_journal_v2`. There is no production Flyway history table. Local and CI databases replay the repository's Flyway V1/V2 files; hosted changes are reviewed SQL recorded in the existing Supabase ledger. Do not create a competing production history or enable `KTOB_AUTO_MIGRATE=true`.

V2 was applied before deployment of code that queries its new tables. Production postchecks found all constraints and indexes valid. The runtime role has SELECT/INSERT/UPDATE on reading experiences with DELETE denied, and SELECT/INSERT/UPDATE/DELETE on journal entries. Both browser roles retain no `app` schema usage and no SELECT on either new table. Counts and content fingerprints for all five preexisting application tables matched before and after migration. A deployment rollback should restore the prior application version while retaining the additive tables and any new reader material; it should not drop journals or reset the schema.

### Migration safety and recovery evidence

Static review of the exact V2 SQL finds no modification or removal of existing reader rows. Its only existing-table change adds `UNIQUE(id,work_id)` to `library_entries`; existing uniqueness of the primary-key `id` already guarantees those pairs are unique. The migration otherwise creates two tables, their indexes/constraints, and permissions on those new tables.

Read-only preflight at 22:54–22:55 UTC on 23 November confirmed the healthy KTOB target on PostgreSQL 17.12, the two expected baseline ledger entries, five application tables, 20 validated constraints and 10 valid/ready indexes. No other active transactions, application locks, blockers or prepared transactions were observed. The library table had one row and occupied 57,344 bytes including indexes. Counts were two reader profiles, two privacy settings, 41 catalog works, zero editions and one library entry; those counts and all five tables' content fingerprints remained identical after V2. No private row contents were retrieved for these checks.

Effective privileges showed no browser-role schema/table access, no elevated `ktob_app` role flags or inherited memberships, and no global or `app` default-ACL entries. The configured Data API schema list was not visible through the inspected PostgreSQL settings; the verified claim is effective browser-role denial. The migration payload set `SET LOCAL lock_timeout='5s'` and `SET LOCAL statement_timeout='60s'`, without an explicit transaction-control wrapper.

The safe application rollback is to return Render and Vercel to their recorded prior deployment versions while **keeping V2 tables and all reader material**. Baseline Java source `65044662983b5750914abea53d2a583ae275d29b` does not query the new tables; its existing schema queries remain compatible. This compatibility was reviewed in source, not tested as a deployed rollback. Keep production `KTOB_AUTO_MIGRATE=false`. Earlier code temporarily cannot display the new reading/journal features, but it does not erase their data.

Supabase's [migration transaction guidance](https://supabase.com/kb/troubleshooting/partial-migrations-and-schema-inconsistencies-from-embedded-transactions-13ae82) describes the runner's built-in transaction wrapper and warns against embedded transaction-control commands. The [official MCP source](https://github.com/supabase/mcp/blob/main/packages/mcp-server-supabase/src/platform/api-platform.ts) forwards the payload once to the Management API migration endpoint; the [public self-hosted runner](https://github.com/supabase/supabase/blob/master/apps/studio/lib/api/self-hosted/migrations.ts) places the SQL and ledger insertion in one transaction. The hosted handler's internal implementation was not independently source-verified. The successful ledger and schema postchecks establish the actual outcome of this application; a hosted failure/rollback scenario was not exercised.

For any later migration or transport failure, inspect both the Supabase ledger and actual schema before retrying. Do not assume a timeout means nothing committed, and do not rerun this applied V2. If a correction is needed, create a separate reviewed migration and fix the specific constraint, permission or application behavior while retaining existing rows. Do not use DROP, schema reset, destructive rollback or an older whole-database restore as the normal release rollback.

**Full-data backup export and restore testing were not executed.** Automatic approval review rejected the requested export because migration authorization did not include disclosure of full private production rows through the connector response. No raw private rows were retrieved, and the export was not retried through another route. Supabase's [backup documentation](https://supabase.com/docs/guides/platform/backups) recommends manual exports for Free projects; neither automated recovery nor an actual restorable backup is claimed here. Any future backup needs an authorized private destination and a separate restore test; an application-only dump would not be a complete Supabase Auth/account backup.

For this exact additive release, the accepted recovery path combines the verified schema/permission/lock preflight, bounded migration locks, unchanged before/after counts and content fingerprints, post-migration constraints/grants checks, and application rollback that retains new tables and data. This supports the migration's limited scope; it does not establish recovery from an unrelated whole-database loss. Prior Render and Vercel deployment IDs are recorded above for application recovery.

### Documentation validation completed locally

- `python docs/architecture/validate_contract.py`: passed, 16 UML sources / 57 designed operations / 47 schemas.
- `python docs/implementation/validate_handoff.py`: passed, all 57 operation assignments and local document links.
- Workflow-pinned PlantUML 1.2025.4: syntax validation passed; all 16 diagrams rendered to SVG without renderer errors.

Java and Angular local validation are recorded separately in the evidence table above. Both PRs passed remote CI; the production migration, Render and Vercel deployments, public API checks, and preview/production public-page checks have completed. Authenticated acceptance remains outstanding and must receive its own evidence before the integrated release is called fully verified.

The completed Java run used disposable PostgreSQL 17.12 with `KTOB_TEST_POSTGRES=true`, `KTOB_AUTO_MIGRATE=true` **only for that disposable database**, and a local test JDBC configuration. The integration tests use Spring Security's test JWT context; they do not prove a real Supabase token or deployed production workflow. The public live checks establish liveness, anonymous rejection and CORS behavior. The authenticated smoke check below remains required to verify persistence and ownership with real test-account tokens.

### Repeatable live API smoke check

`scripts/smoke_reading_journal.py` uses Python's standard library and accepts only these environment variables:

- `API_BASE_URL`: the verified deployment URL ending in `/api/v1`.
- `QA_READER_A_TOKEN` and `QA_READER_B_TOKEN`: valid access tokens for **two distinct, owner-authorized, isolated test accounts** in the KTOB Supabase project. Obtain them through the normal test-user authentication flow and provide them securely in the process environment. Do not paste credentials into this document, shell history or logs.

The additive migration and backend deployment are verified. Once both isolated test accounts and their valid access tokens are available, run:

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

The [free AI API comparison](free-ai-api-options.md) evaluates current alternatives, no-card evidence, quotas and data handling. It recommends candidates for later evaluation; no provider has been activated or qualified for this account.

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
