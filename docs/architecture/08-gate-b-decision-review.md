# KTOB — Gate B Decision Review (2026-11-20)

> **Status:** DRAFT FOR HUMAN REVIEW — not a Gate B approval and not authorization to implement.
> Prepared after the 16/16 UML and 57-operation OpenAPI consistency pass at commit `7f3a3bcc13226a968dd2e67115000389e5da0018`.
> The professor's exact document was not uploaded with this decision review; academic facts below reproduce the **earlier user-provided assignment wording**, not an independently authenticated rubric.

## 1. Academic requirement: partly resolved

The user shared on 2026-11-19 that the university project asks for:

1. A **Java web service** using **"SOAP ou REST"**.
2. A **frontend consuming the team's own Java service**.
3. The application to **consume a free online external web service**.
4. Work individually or in a team of **at most two**, with a validation date to be announced.

**Design mapping (supported by this user-supplied description):**

| Requirement | KTOB evidence to demonstrate | Status |
|---|---|---|
| Java SOAP **or** REST web service | Java 21 / Spring Boot exposing versioned REST/JSON `/api/v1` and OpenAPI | **REST permitted by reported wording; not implemented** |
| Frontend consumes Java service | Angular browser app calls Spring Boot, not direct business-table access | **Design matches; integration demonstration pending** |
| Java application consumes free web service | Java `catalog` adapter calls Open Library Search API for reader-initiated lookup | **Official public API documented; working call and policy compliance pending** |
| Independent network microservices / registry / WSDL | Not mentioned in reported assignment | **Not required by the supplied wording; full rubric not available** |
| Submission/deadline | Validation date later | **Not confirmed** |

**Interpretation:** The `SOAP ou REST` decision is not a blocker to using REST. Do **not** infer that a later written rubric cannot impose other deliverables. In a faculty demo, show Java service operations independently, Angular consumption of that service, and Java consumption of an external free API with a documented fallback.

### External public service evidence

Official Open Library developer resources:
- https://openlibrary.org/developers/api
- https://openlibrary.org/dev/docs/api/search
- https://openlibrary.org/dev/docs/api/books

Open Library publicly documents search, works and editions APIs for low-volume, human-initiated use. Their current developer guidance favors caching, application identification and avoiding use as a high-traffic third-party data backend. Documented nominal rate limits are **1 request/sec** without identification or **3 requests/sec** with identifying User-Agent/contact details. Application registration is recommended in the developer guidance. **Do not treat these limits or provider availability as deployment guarantees**; recheck before implementation. Manual creation of private works remains mandatory as a fallback.

## 2. Gate B decision register — recommended, NOT approved

The following are coherent **proposals** grounded in the existing UML and OpenAPI. Some require a later contract update after user approval. Nothing here supersedes the `PROPOSED` labels in the other documents.

| ID | Topic | Recommendation | Contract impact | Gate status |
|---|---|---|---|---|
| B01 | Protocol & service topology | REST/JSON Java service, Angular client, Open Library through Java; one modular Spring Boot deployable | Existing model unchanged | **Supported by user-reported rubric; await sign-off** |
| B02 | Work and manual metadata | Global Open Library work, private manual work. No automatic merging of near-duplicates; allow deliberate selection | Existing `BookWork` identity unchanged | PROPOSED |
| B03 | Reading/rereading | Keep derived `WANT_TO_READ` (zero experiences), separate reading sessions, max one open session, historical imports explicit | Existing model unchanged | PROPOSED |
| B04 | Library archive | Archive is reversible and owner-readable but read-only until restore, retaining membership/history/offers/acquisitions | Existing model unchanged | PROPOSED |
| B05 | Rating | Optional **1–5 stars in 0.5 steps**, `null` if not rated, attached to each `ReadingExperience` | Add numeric min/max/multipleOf to the DTO and conceptual DB constraint **after approval** | PROPOSED |
| B06 | Reading progress | Optional **integer percentage 0–100**, independent of edition/format; do not infer percent from raw page counts in R1 | Replace current loosely typed `progress: String` with typed `progressPercent` after approval | PROPOSED |
| B07 | Profile & onboarding | Optional progressive onboarding, only editable display name as reader-facing profile field; no mandatory biography, age or public profile | Existing profile API; validate display name; handle default display name at first sign-in | PROPOSED |
| B08 | Spoiler safeguards | **NO_SPOILERS** by default for AI conversation and recommendations; optional **FULL_BOOK_SPOILERS** only with explicit per-request reader authorization. No unreliable progress-based spoiler assertions | Introduce request-level spoiler preference / policy to AI contracts after approval | PROPOSED |
| B09 | AI privacy & memory | Keep both AI-processing and history-personalization consent off by default; per-entry journal exclusion always wins; approved memory only by explicit choice | Existing model unchanged; consent UI and selected provider must be verified | PROPOSED, provider BLOCKED |
| B10 | Warning boundaries | Firm user boundaries; unknown/partial warning evidence is **not** proof of safety; temporary exception only for one request | Existing model unchanged | PROPOSED |
| B11 | Collections/acquisition | Preserve independent shelf, acquisition, offers, saved collections; one-snapshot offer has immutable currency+observation timestamp | Existing model unchanged | PROPOSED |
| B12 | R1 export | Owner-scoped **JSON essentials export** of precisely library, experiences, journal, collections, preferences. Clear notice that this is **not** full account portability | Existing `Export` DTO unchanged; full archive requires separate plan | PROPOSED |
| B13 | Full account deletion | Require recent reauthentication; stop sessions, delete/cascade business data under reviewed policy, delete Auth identity, reconcile partial failure; disclose external AI retention limitations and any backups. Never claim immediate provider erasure without evidence | **No DELETE /me endpoint yet**; create deletion service contract **only after specific approval** | BLOCKED: policy + provider evidence |
| B14 | API stability | Keep 35 paths/57 operations, owner-aware 404, archived 409, merged monetary PATCH, fixed-currency offer comparison, idempotency and privacy protections | Existing model unchanged | PROPOSED |
| B15 | Book offers in Tunisia | Keep sourced, explicit, labelled manual historical offers; verified live price availability remains unimplemented until a lawful reliable provider is chosen | Existing unavailable response; **do not claim Find-a-Copy live matching works** | BLOCKED: provider |
| B16 | AI provider | Require no-credit-card/free feasibility, quotas, confidentiality/retention and language competence tests before approval; implementation uses adapter and may fail closed when unavailable | No provider selected; no live AI calls authorized | BLOCKED: provider |

### Why these defaults?

The default model should favor **small, testable, privacy-aware R1 contracts**, not speculative enrichment. A percentage-based progress field covers print, eBook and audio without automatically inferring edition lengths; ratings are optional per reading session; explicit full-book spoiler permission avoids unreliable inference from incomplete text or progress.

The export currently covers **five sets of essentials**, not every stored personal record. Similarly, a soft-archived library item is not deleted from the account. These distinctions must remain visible in the UI and privacy documentation.

**Product scope warning:** The earlier Complete Core Experience promise includes AI literary companionship, Find a Copy and data control. Until the AI vendor, seller source and full deletion policy are resolved, these cannot be honestly presented as fully implemented. Do not remove them silently from R1 or substitute a mocked provider.

## 3. Architecture demonstration acceptance (after approval/implementation)

| Test | Expected evidence |
|---|---|
| Java service itself | `GET /health`, authenticated private CRUD endpoints, OpenAPI and errors, independent from Angular |
| Frontend consumes own service | Network trace: Angular -> Java; no browser writes business DB directly |
| External free service consumed by Java | Java Catalog adapter calls Open Library `/search.json` on a human-initiated lookup; show metadata provenance |
| Failure resilience | Open Library empty/unavailable -> private manual work fallback; AI provider absent -> truthful 503/no fabricated response |
| Privacy isolation | Two accounts cannot access one another's journal, works, offers, memories or archives |
| Reading lifecycle | WANT_TO_READ entry with no reading sessions; reread preserves old notes; archived entry refuses descendant writes |
| Boundaries and consent | No external AI call without processing opt-in; no excluded journal text in personalization |
| Offline/documentation | 16 PlantUML diagrams, OpenAPI 3.1, persistence model, security threat/ownership checks and reproducible CI evidence |

## 4. Remaining decisions before Gate B approval

**Needs reader approval:** B01–B12 and B14, especially rating half-steps, percentage progress, spoiler-level model, and limited export. The user can approve the defaults together and request individual deviations.

**Requires external verification/explicit policy:** B13 full-account deletion and retention; B15 verified seller provider; B16 external AI vendor. Decide whether unavailable integrations may remain visibly degraded in a university demo, but do not mislabel them as working features of Complete Core Experience.

**Academic evidence still missing:** the actual course assignment document, any expanded grading rubric, and validation/deadline information. REST is permitted according to the professor wording previously supplied by the user.

**Gate B:** OPEN. **Gate C:** CLOSED. This memo is a proposal, not a user approval.

## 5. Proposed next review order

1. Approve or modify B01–B12/B14 (particularly ratings, progress and spoiler behavior).
2. Finalize provider/retention/price source options and full deletion policy.
3. Reconcile any approved decisions into UML, OpenAPI, conceptual DB and validation CI in one controlled architecture update.
4. Verify CI again, then ask the reader for **explicit Gate B sign-off**.
5. Only after sign-off may Gate C implementation be considered.
