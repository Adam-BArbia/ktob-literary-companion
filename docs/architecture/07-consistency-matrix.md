# KTOB — Cross-document consistency matrix (design v0.2)

Each row identifies which UML, OpenAPI contract, persistence rule and policy represent the same R1 behavior. This is **design traceability**, not proof of implementation.

| Scenario | UML file(s) | API endpoint / DTO | Persistence constraint | Security/architecture rule |
|---|---|---|---|---|
| Catalog book add | 01,02,07,13 | `POST /library`; `LibraryCreate/LibraryEntry` | `UNIQUE(reader_id,work_id)`; edition from work | Verified reader; catalog global or owned private; duplicate 409; no inferred reading |
| Profile / onboarding | 02 | `ReaderProfile`, `PATCH /me` optional `displayName` 1–100 chars | First authenticated access provisions neutral Reader profile, no bio/age/public profile | Auth is separate from AI-processing/personalization opt-in |
| Work ownership | 02,07 | `BookWork.origin/ownerReaderId` and manual-create operation | Global OPEN_LIBRARY has zero owners; MANUAL has exactly one; one canonical works table | Private work readable only by owning reader |
| Manual work add | 01,02,07 | `POST /catalog/manual-works` then `POST /library` | One `catalog_works.work_id`; MANUAL implies owner_reader_id | Private only, other-reader manual IDs not visible |
| Start reading | 02,08,13,14 | `POST /library/{entryId}/experiences`; `ExperienceWrite` | open-status uniqueness per library entry | Actual reading starts CURRENTLY_READING; shelf derived; WANT_TO_READ only if no experience |
| R1 optional rating/progress | 02,08,13,14 | `ReadingExperience`, `ExperienceWrite`, `ExperiencePatch`: nullable `rating` 1–5 step 0.5 and integer `progressPercent` 0–100 | Exact numeric and integer bounds; independent of reading state | Unrated and no-progress are valid; no automatic status or page conversion |
| Reread or historical import | 02,08,14 | same POST; `historicalImport`, `ExperiencePatch` | new experience, previous records untouched; deterministic selection | Terminal finished/DNF, explicit historical init, no concurrent open |
| Journal entry | 02,03,08 | `POST /experiences/{experienceId}/journal`; `JournalWrite` | Owned experience; `allow_for_personalization` default false | Scope flag + personal opt-in AND journal exclusion |
| Request-level spoiler safeguard | 01,03,09,10,13 | `SpoilerLevel` and `fullBookSpoilersConfirmed` on `MessageWrite` / `RecommendationRequest`; effective level in outputs | Effective turn/request policy recorded; no account-wide spoiler flag | NO_SPOILERS default, FULL_BOOK_SPOILERS needs same-request confirmation; 422 before AI; firm boundaries and consent persist |
| Optional personalized chat | 01,03,10 | Conversation messages and privacy settings | Scopes restrict context and excluded journal entries | `UContext` optionally extends UChat and URecommend; processing consent mandatory for both |
| Conversation with AI | 03,04,05,10 | `POST /conversations/{id}/messages`; `ConversationTurn` | Atomic two messages + optional pending proposals | Processing opt-in checked at dispatch; 403 missing, 503 provider |
| Recommendation | 03,09,13 | `POST /recommendations`; `RecommendationResult.items[]` | `recommendation_requests` 1:N `recommendation_items`; boundary exceptions scoped to request | AI consent, separate personalization, firm boundary, unknown warning not safe |
| Memory approval/revoke | 03,10,15 | `POST /memory-proposals/{id}/decision`; `PATCH/DELETE /memories/{id}` | proposal belongs to own assistant message; `UNIQUE(proposal_id)`; revoked_at terminal | Explicit approval only, no reactivation |
| Create/manage collection | 01,02 | `GET /collections/{id}/entries`, `PUT/DELETE /collections/{id}/entries/{entryId}` | membership requires same-reader collection and library entry | Owner-scope and deterministic member pagination; PUT 204 |
| Verified offers and saving | 02,04,11,16 | `GET /catalog/works/{workId}/offers`; `OfferLookupMeta`; `POST /library/{id}/saved-offers` | immutable observedAt; sourceType; optional price+currency pair | Unselected provider -> unavailable; historical USER_SUPPLIED != verified |
| Acquisition money and offer filtering | 02,11 | `Acquisition`, `AcquisitionWrite`, `AcquisitionPatch`; offer `maxPrice+currency` query | Nonnegative price, active ISO 4217 code; pair constraint on merged PATCH | 422 invalid pair; 400 missing price-filter currency; no FX comparison |
| Acquisition | 02,11,13 | `POST /library/{entryId}/acquisitions`; `AcquisitionWrite` | Explicit row, no reading FK mutation | Owner verified, idempotency optional; no purchase inferred from offer |
| R1 export | 04,06,12 | `GET /me/export`; `Export` JSON | Five arrays: library, experiences, journal, collections, preferences | Export module, reader-scoped, intentionally not complete personal archive |
| Archived descendant mutation | 02,07,08,11 | Entry/experience/journal/membership/offer/acquisition writes return 409 | Read-only archived parent; preserved historical children/memberships | Owner check first; 409 LIBRARY_ENTRY_ARCHIVED, 404 other owner; restore re-exposes memberships |
| Library archive/restore | 02,07 | `DELETE /library/{entryId}`; `POST /library/{entryId}/restore` | archived_at, retain all dependent records, unique even archived | Idempotent archive, no cascade, restoration explicit |
| Full account delete | 01,03,05 | No active DELETE /me endpoint (**BLOCKED**) | Purge/dependency/retention policy not yet approved | Reauthentication and session invalidation unresolved |
| Cross-reader UUID abuse | 02,03,07–12 | All private endpoints require JWT; 404 inaccessible resource | owner chain through reader ID, composite foreign keys or equivalent checks | No IDOR/BOLA, private work IDs hidden |
| Pagination | 01,07,11 | All collection/list GET DTOs and `meta.nextCursor` | Stable ordered keyset/read-scoped cursor | Limits 1–100 and reader-bound cursors |
| Health endpoint | 05 | `GET /health` | No private DB information | Only public endpoint; payload contains basic status |

## Canonical terminology

| Domain | API / database counterpart | Rule |
|---|---|---|
| `BookWork.workId` | `BookWork.id`, `catalog_works.work_id` | One canonical UUID, OPEN_LIBRARY/global vs MANUAL/reader private |
| `BookEdition.editionId` | `BookEdition.id`, `catalog_editions.edition_id` | Optional version; format null if unknown |
| `LibraryEntry.entryId` | `LibraryEntry.id`, `library_entries.id` | Reader+work unique, soft archive |
| `ReadingExperience.status` | `ReadingExperience.status`, `reading_experiences.status` | Never WANT_TO_READ; shelf status derived |
| `JournalEntry.allowForPersonalization` | same DTO, `journal_entries.allow_for_personalization` | false excludes content unconditionally |
| `PrivacySettings.aiProcessingOptIn` | same DTO, `privacy_settings.ai_processing_opt_in` | Mandatory to dispatch AI |
| `RecommendationRequest.usePersonalContext` | same DTO, request record | Additionally requires personalization flags |
| `MemoryProposal.status` | `MemoryProposal.status`, `memory_proposals.status` | PENDING -> APPROVED / DISMISSED -> REVOKED after approved |
| `SavedOffer.observedAt` | `Offer.observedAt`, `saved_offers.observed_at` | Immutable observation; R1 no recheck |

## Explicitly unresolved BLOCKED issues

- The user-reported assignment explicitly allows **SOAP ou REST**; REST protocol is therefore an allowed choice under that text. Complete original grading/deployment rubric and validation date remain unverified (see [Gate B review](08-gate-b-decision-review.md)).
- AI provider/model, account free-tier availability, privacy and retention.
- Reliable and lawful Tunisian seller/price search service.
- Full account deletion/re-auth/retention and complete archive behavior.

**APPROVED R1 product defaults (2026-11-20):** shelf projection and historical imports, nullable 1–5 half-star ratings, nullable 0–100 integer progress, minimal optional profile, per-call spoiler policy, reversible archive, five-array JSON essentials export, privacy and idempotency rules. **Not approved:** AI provider, verified seller provider, full account deletion/retention, and overall Gate B/Gate C.

No implementation, live migration or provider deployment is authorized by this matrix.
