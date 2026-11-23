# Angular screens, routes and UX specifications

**All routes are proposed frontend routes**, distinct from backend HTTP paths. Use Angular standalone lazy-loaded feature components, responsive keyboard-operable forms, accessible labels, error summaries and live region feedback. Plan UI for desktop and mobile width even though R1 is a web application.

**Reading-journal release mapping:** `/books/:entryId` integrates book overview, reading history and the selected reading's journal on one responsive page. A `reading` query parameter selects a reading when linking from the diary. `/diary` aggregates actual owned readings with explicit missing dates and no sample data. The nested routes below remain the original R1 navigation plan, not additional implemented endpoints. Actual lazy routes live in `apps/web/src/app/app.routes.ts`.

| Route | Screen | Primary API operations / UI states |
|---|---|---|
| `/auth` | Sign in / register using Supabase Auth | Supabase Auth only; redirects if already signed in |
| `/library` | Personal library overview / filters / archived toggle | `GET /library`, `GET /collections` |
| `/catalog/search` | Search Open Library, manual-entry fallback | `GET /catalog/works`, `POST /catalog/manual-works`, `POST /library` |
| `/books/:entryId` | Reader-owned book detail and acquisition intent | `GET/PATCH/DELETE /library/{id}`, `POST /library/{id}/restore` |
| `/books/:entryId/readings` | Reading history, rereads and experiences | `GET/POST /library/{id}/experiences`, `PATCH /experiences/{id}` |
| `/readings/:experienceId/journal` | Reflection editor, quotes, feelings | `GET/POST /experiences/{id}/journal`, `PATCH/DELETE /journal/{id}` |
| `/collections` | Create, rename, delete collections | `GET/POST /collections`, `PATCH/DELETE /collections/{id}` |
| `/collections/:id` | Read memberships, add/remove book | `GET /collections/{id}/entries`, `PUT/DELETE /collections/{id}/entries/{entryId}` |
| `/advisor` | General literary advisor and recommendations | `GET/POST /conversations`, `POST /recommendations` |
| `/advisor/conversations/:id` | Per-book/general conversation with spoilers policy | `GET/POST /conversations/{id}/messages` |
| `/advisor/memories` | Review proposals, edit/revoke memories | `GET /memory-proposals`, decision POST, `GET/PATCH/DELETE /memories` |
| `/books/:entryId/copies` | Verified provider unavailable state, saved observations and acquisitions | `GET /catalog/works/{id}/offers`, saved offers/acquisitions |
| `/settings` | Display name, consent, boundaries, preferences, export | `GET/PATCH /me`, privacy, boundaries, preferences, `GET /me/export` |

## Shared app shell and IA

Top navigation: **Library · Discover · Advisor · Collections · Settings**. Within library entry: **Overview · Reading History · Journal · Copies**. Provide accessible empty state buttons guiding the user to catalog lookup/manual creation. Do not force onboarding or an AI prompt to use the private library.

## Essential micro-interactions

- Book lookup: debounce, present sourced results as suggestions, show unknown metadata honestly; allow manual addition when offline, no duplicate work silently created. Clearly distinguish edition versus work.
- Shelf: `WANT_TO_READ` is shown for zero sessions. Clicking “Start reading” creates a distinct experience; reread button creates new record and preserves past reflections. Archive clearly explains historical preservation and restore.
- Rating: half-star input keyboard-operable and optional; progress percent numeric whole 0–100, not page count; editing progress must not implicitly mark a session finished.
- Journal: explicit per-note `allowForPersonalization` default unchecked, private note stored independent of AI consent. Show source and language without inferring emotion.
- Advisor: two separate consent toggles (processing and personalization). With processing off, surface a consent-required state and never auto-toggle. On every AI action show `NO_SPOILERS` default; choosing `FULL_BOOK_SPOILERS` reveals a **per-request confirmation** checkbox, not a sticky account setting. A new NO_SPOILERS turn must filter prior full-spoiler content from provider context.
- Content boundaries: show strict restrictions and one-request exceptions; SURPRISE never bypasses firm restrictions. Unknown classification is shown as unverified rather than safe.
- Approved memories: user sees proposed text, can edit then approve or dismiss; revocation is terminal; no automatic memory acceptance.
- Book copies: if verified provider unconfigured, display “Verified bookstore search unavailable” + manual historical saved offer form; never render dummy live sellers. Display currency label beside numeric price, filter only with explicit currency.
- Export: “Download essentials as JSON” and explain included categories and omissions. No “Delete account” functionality until privacy policy approved.

## UX state matrix

Every data screen must handle `loading`, `success`, `empty`, `validation error`, `401 re-auth`, `403 consent`, `404 not found/private`, `409 duplicate/archived`, `429 throttle`, `503 provider down`, `network offline/cold start`. Never present these as a generic successful empty array. Modal confirmations for archive and full spoilers are distinct and accessible.

## Accessibility and performance

WCAG-oriented: focus visible, proper buttons, form labels, validation errors linked to fields, keyboard dialog close/focus restoration, semantic headings. Use lazy routes/components, cache previously fetched catalog data with known age, show skeletons instead of blank pages, and avoid infinite retries on sleeping Render instance. Export downloads must not expose bearer tokens in URL.
