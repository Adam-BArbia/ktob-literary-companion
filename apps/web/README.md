# KTOB web app

Angular 22 + Tailwind CSS 4, with a standalone, lazy-loaded route structure and real Supabase email/password authentication. The browser calls the Java API for reader, catalog, library, reading, journal, privacy and conversation data; it never connects directly to the private database schema or the AI provider.

## Current screens

- `/`: editorial home with clear library/discovery actions and explicitly curated reading inspiration.
- `/auth`: sign in, confirmation recovery and safe internal return navigation.
- `/auth/sign-up`: dedicated registration with email, password, confirmation, field-linked errors, and a verification-email state. `/sign-up` redirects here.
- `/library`: private shelf with title/author and reading-status filters, favorites, grid/list layout, links to book details, archive confirmation, restore and undo.
- `/books/:entryId`: book details with source attribution, favorites, reading lifecycle/history, per-reading ratings, private journal entries, and archive/restore. The optional `?reading=<experienceId>` opens a reading from the loaded history.
- `/diary`: chronological reading diary with recorded dates, per-reading ratings, status filters, and personal statistics derived from actual library and reading records.
- `/catalog/search`: Open Library search, source-labeled results, individual addition feedback, and private manual entry. Supports `?q=...` and `?manual=true`.
- `/advisor`: general literary and book-specific conversations, real saved history, voluntary AI processing consent, per-question spoiler controls and recoverable provider errors. `?workId=<workId>` prepares a book conversation; `?conversationId=<conversationId>` reopens saved history.
- `/settings`: persisted display name, account details, actual AI processing permission and a separate action to revoke unused saved personalization scopes.
- `/about` and `/privacy`: public product and current-data-handling information.
- `/collections`: clearly labeled upcoming feature.

There are no fabricated library records, assistant replies, live seller offers, account-deletion controls, or fake social-login buttons. Original typographic cover illustrations are decorative, not publisher-provided artwork. Reader data screens render actual API responses.

## Development

Use Node 24 and the committed dependency lockfile:

```sh
cd apps/web
npm ci
npm start
```

The default public config points at the Java API on `http://localhost:8080/api/v1` and leaves authentication unconfigured. Configure a dedicated test Supabase project before exercising local authentication; never put a privileged key in browser configuration.

```sh
npm test -- --watch=false
npm run build
```

## Deployment

The Vercel build command is:

```sh
node scripts/configure-api.mjs && npm run build
```

It reads `KTOB_API_URL`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` and writes the public runtime config. Only a Supabase publishable key belongs here. The deployed frontend is `https://ktob-web-front.vercel.app`; the Java API base is `https://ktob-api.onrender.com/api/v1`.

Supabase Auth URL configuration must include the deployed site and allow `https://ktob-web-front.vercel.app/auth` as a redirect URL. The signup and resend flows request that exact same-origin route. Email delivery and confirmation depend on the project's email/provider configuration and limits; they are separate from UI/SDK test coverage. Preview origins require their own explicit configuration if real authentication is tested there.

Render's allowed frontend origin remains the production Vercel origin. Do not broaden CORS or disable email verification to test a preview.

## Design and behavior

See [the UI design guide](../../docs/implementation/16-ui-design-guide.md). Shared colors, text styles, controls and feedback live in `src/styles.css`; SVG icons, decorative covers, book headers, rating controls, journal notes, and confirmation dialogs are shared components. Forms use real HTML labels and field-associated validation, the mobile navigation supports Escape, native confirmation dialogs preserve keyboard focus, reduced motion is respected, and navigation restores scroll/focus.

Ratings belong to individual reading experiences, including rereads. The accessible five-star control supports 1–5 stars in half-star steps and explicit clearing to `null`. Saving a rating does not change reading status. Readers can start, pause, resume, finish, or stop a reading, log an explicitly finished historical reading, and start a reread while retaining earlier ratings and notes. Optional whole-number progress is independent of status; finishing does not force it to 100%.

The private journal supports reviews, reflections, quotations, notes, and feelings, with optional reader-supplied emotion tags. Readers can create, edit, and delete entries; failed saves preserve the draft. `allowForPersonalization` defaults to false, and changing that note-level permission does not itself enable AI or send content to a provider. Archived books preserve readable history and notes; editing requires restoration.

## Literary companion boundaries

The advisor requires the six implemented Java privacy/conversation operations and their additive database migration. Deployment evidence and actual provider qualification are recorded separately in the release guide; frontend unit tests use mocked Java responses and do not prove live inference.

Opening a page, choosing a starter prompt or saving permission does not send a model request. The reader must explicitly save AI processing consent and then choose Send. Initial V3 includes only the submitted question, bounded eligible conversation history and minimal selected-book metadata; it excludes stored journal entries, reading history, account details and personalization scopes. General and book-specific conversations belong to the reader, independently of library archive state.

The UI appends a reader/assistant pair only after Java returns a successful persisted `ConversationTurn`. A pending or failed request keeps the draft. Identical in-page retries with the same question and spoiler choice reuse a UUID idempotency key; changing the request obtains a new key. There is no automatic provider retry loop. A 429 response disables sending for its bounded `Retry-After` period, and an oversized inference context gives an actionable shorten-the-excerpt error. Spoiler permission resets after every attempted send, and full-book spoilers require a fresh confirmation. Previous full-spoiler messages appear in closed, labeled disclosures; the backend separately excludes them from later no-spoiler context. Model output is rendered as escaped plain text with automatic language direction, never executable HTML or active model-generated links.

Consent revocation stops future external requests; it does not recall data already dispatched or erase saved conversations. The privacy editor displays only server-confirmed state, keeps failed changes visible and leaves sending disabled until permission is confirmed again. Provider outages remain distinct from an empty successful conversation.

## Pagination and statistics

- Conversation and message history load pages of 100 records, with explicit controls for earlier pages. A direct conversation link searches the first 11 conversation pages to resolve its metadata; if the record is older, the reader can continue loading history and select it from the list. Displayed history is separate from the smaller, bounded model context.
- The library follows up to five cursor pages of 100 records, loading at most **500 books**, including archived entries. When more records remain, the interface explicitly limits its counts, search, and filters to the loaded books. Metadata requests run in bounded batches.
- The diary loads at most **100 recently saved books** and the latest **100 reading experiences per book**. If any cursor indicates more records, a visible notice explains that the statistics cover loaded records rather than complete lifetime totals. Per-book reading history and journal lists offer controls to load earlier cursor pages.
- Finished books are counted once; rereads retain separate ratings. The average uses recorded per-reading ratings, and the yearly finished-read count uses recorded finishing dates. Undated experiences are labeled “Date not recorded”; no dates, streaks, or statistics are fabricated. Reading history includes archived books, while the current shelf and currently-reading counts exclude archived books.

Liveness status describes only API connectivity, not database/provider readiness. Requests have bounded cold-start timeouts. The new reading and journal screens require the corresponding Java endpoints and the reviewed additive database migration before release.
