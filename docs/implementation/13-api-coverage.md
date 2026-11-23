# OpenAPI coverage register — all 57 operations

**Generated from the checked-in `docs/architecture/openapi.json` at architecture v0.3.0.** Paths, operationIds and their module tags are authoritative in the OpenAPI source. The milestone/UX column is the implementation assignment. Exactly **57** rows and **35** paths are expected.

**Implementation status is separate:** [implemented-operations.json](implemented-operations.json) contains only implemented, tested routes. The reading-journal release uses the existing four Reading operations, four Journal operations and library PATCH; it introduces no new API operation. The integrated book page exposes reading history and journal together, and the diary consumes the same owner-scoped paginated APIs. [Release evidence](overnight-release-demo.md) records validation and deployment status.

| operationId | Method & API path | Owner | Milestone | Frontend / evidence |
|---|---|---|---|---|
| `getMyProfile` | `GET /me` | Reader | M1 | /settings (profile GET/PATCH: /settings) |
| `updateMyProfile` | `PATCH /me` | Reader | M1 | /settings (profile GET/PATCH: /settings) |
| `getPrivacySettings` | `GET /me/privacy` | Reader | M3 | /settings (profile GET/PATCH: /settings) |
| `updatePrivacySettings` | `PATCH /me/privacy` | Reader | M3 | /settings (profile GET/PATCH: /settings) |
| `listMyBoundaries` | `GET /me/boundaries` | Reader | M3 | /settings (profile GET/PATCH: /settings) |
| `createMyBoundary` | `POST /me/boundaries` | Reader | M3 | /settings (profile GET/PATCH: /settings) |
| `updateMyBoundary` | `PATCH /me/boundaries/{id}` | Reader | M3 | /settings (profile GET/PATCH: /settings) |
| `deleteMyBoundary` | `DELETE /me/boundaries/{id}` | Reader | M3 | /settings (profile GET/PATCH: /settings) |
| `listMyPreferences` | `GET /me/preferences` | Reader | M3 | /settings (profile GET/PATCH: /settings) |
| `createMyPreference` | `POST /me/preferences` | Reader | M3 | /settings (profile GET/PATCH: /settings) |
| `updateMyPreference` | `PATCH /me/preferences/{id}` | Reader | M3 | /settings (profile GET/PATCH: /settings) |
| `deleteMyPreference` | `DELETE /me/preferences/{id}` | Reader | M3 | /settings (profile GET/PATCH: /settings) |
| `exportMyEssentialData` | `GET /me/export` | Reader | M3 | /settings (profile GET/PATCH: /settings) |
| `searchWorks` | `GET /catalog/works` | Catalog | M1 | /catalog/search |
| `getWork` | `GET /catalog/works/{workId}` | Catalog | M1 | /catalog/search |
| `listWorkEditions` | `GET /catalog/works/{workId}/editions` | Catalog | M1 | /catalog/search |
| `createPrivateManualWork` | `POST /catalog/manual-works` | Catalog | M1 | /catalog/search |
| `listMyLibrary` | `GET /library` | Library | M1 | /library and /books/:entryId |
| `addWorkToLibrary` | `POST /library` | Library | M1 | /library and /books/:entryId |
| `getMyLibraryEntry` | `GET /library/{entryId}` | Library | M2 | /library and /books/:entryId |
| `updateMyLibraryEntry` | `PATCH /library/{entryId}` | Library | M2 | /library and /books/:entryId |
| `removeMyLibraryEntry` | `DELETE /library/{entryId}` | Library | M2 | /library and /books/:entryId |
| `listMyCollections` | `GET /collections` | Collections | M2 | /collections |
| `createMyCollection` | `POST /collections` | Collections | M2 | /collections |
| `updateMyCollection` | `PATCH /collections/{collectionId}` | Collections | M2 | /collections |
| `deleteMyCollection` | `DELETE /collections/{collectionId}` | Collections | M2 | /collections |
| `addEntryToCollection` | `PUT /collections/{collectionId}/entries/{entryId}` | Collections | M2 | /collections |
| `removeEntryFromCollection` | `DELETE /collections/{collectionId}/entries/{entryId}` | Collections | M2 | /collections |
| `listMyReadingExperiences` | `GET /library/{entryId}/experiences` | Reading | M2 | /books/:entryId/readings |
| `createMyReadingExperience` | `POST /library/{entryId}/experiences` | Reading | M2 | /books/:entryId/readings |
| `getMyReadingExperience` | `GET /experiences/{experienceId}` | Reading | M2 | /books/:entryId/readings |
| `updateMyReadingExperience` | `PATCH /experiences/{experienceId}` | Reading | M2 | /books/:entryId/readings |
| `listMyJournalEntries` | `GET /experiences/{experienceId}/journal` | Journal | M2 | /readings/:experienceId/journal |
| `createMyJournalEntry` | `POST /experiences/{experienceId}/journal` | Journal | M2 | /readings/:experienceId/journal |
| `updateMyJournalEntry` | `PATCH /journal/{journalId}` | Journal | M2 | /readings/:experienceId/journal |
| `deleteMyJournalEntry` | `DELETE /journal/{journalId}` | Journal | M2 | /readings/:experienceId/journal |
| `listMyConversations` | `GET /conversations` | Advisor | M4 | /advisor |
| `createMyConversation` | `POST /conversations` | Advisor | M4 | /advisor |
| `listMyMessages` | `GET /conversations/{conversationId}/messages` | Advisor | M4 | /advisor |
| `sendMessage` | `POST /conversations/{conversationId}/messages` | Advisor | M4 | /advisor |
| `requestRecommendations` | `POST /recommendations` | Advisor | M4 | /advisor |
| `listMyMemoryProposals` | `GET /memory-proposals` | Advisor | M4 | /advisor |
| `decideMyMemoryProposal` | `POST /memory-proposals/{proposalId}/decision` | Advisor | M4 | /advisor |
| `listMyApprovedMemories` | `GET /memories` | Advisor | M4 | /advisor |
| `editMyApprovedMemory` | `PATCH /memories/{memoryId}` | Advisor | M4 | /advisor |
| `revokeMyApprovedMemory` | `DELETE /memories/{memoryId}` | Advisor | M4 | /advisor |
| `findVerifiedOffers` | `GET /catalog/works/{workId}/offers` | Acquisition | M3 | /books/:entryId/copies |
| `listMySavedOffers` | `GET /library/{entryId}/saved-offers` | Acquisition | M3 | /books/:entryId/copies |
| `saveMyOffer` | `POST /library/{entryId}/saved-offers` | Acquisition | M3 | /books/:entryId/copies |
| `deleteMySavedOffer` | `DELETE /saved-offers/{offerId}` | Acquisition | M3 | /books/:entryId/copies |
| `listMyAcquisitions` | `GET /library/{entryId}/acquisitions` | Acquisition | M3 | /books/:entryId/copies |
| `createMyAcquisition` | `POST /library/{entryId}/acquisitions` | Acquisition | M3 | /books/:entryId/copies |
| `updateMyAcquisition` | `PATCH /acquisitions/{acquisitionId}` | Acquisition | M3 | /books/:entryId/copies |
| `deleteMyAcquisition` | `DELETE /acquisitions/{acquisitionId}` | Acquisition | M3 | /books/:entryId/copies |
| `liveness` | `GET /health` | Operations | M0 | API smoke/health |
| `listMyCollectionEntries` | `GET /collections/{collectionId}/entries` | Collections | M2 | /collections |
| `restoreMyLibraryEntry` | `POST /library/{entryId}/restore` | Library | M2 | /library and /books/:entryId |

## Read the coverage column correctly

- `GET /catalog/works/{workId}/offers` at **M3** means implementing its documented **UNAVAILABLE** state and request validation; it does **not** mean a verified Tunisia-first live seller provider is configured. B15 remains BLOCKED.
- All **Advisor M4** endpoints can implement a real local persistence/authorization lifecycle and a **deny-by-default** AI adapter; the external provider and live model processing remain B16 BLOCKED until qualification. No mock model is called “live AI”.
- `GET /me/export` is five-array essentials JSON, not full portability; **DELETE /me** is deliberately absent because B13 remains BLOCKED.
- Milestone assignments indicate earliest practical vertical slice. Every operation still requires its own successful/error/ownership test before being called implemented.

**Policy:** If any OpenAPI operation is added, removed or renamed, regenerate/reconcile this table and update the test/backlog references in the same PR. The validation workflow checks that all `operationId` entries are covered.
