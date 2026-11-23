# KTOB web app

Angular 22 + Tailwind CSS 4, with a standalone, lazy-loaded route structure and real Supabase email/password authentication. The browser calls the Java API for reader, catalog, library, reading, and journal data; it never connects directly to the private database schema.

## Current screens

- `/`: editorial home with clear library/discovery actions and explicitly curated reading inspiration.
- `/auth`: sign in, confirmation recovery and safe internal return navigation.
- `/auth/sign-up`: dedicated registration with email, password, confirmation, field-linked errors, and a verification-email state. `/sign-up` redirects here.
- `/library`: private shelf with title/author and reading-status filters, favorites, grid/list layout, links to book details, archive confirmation, restore and undo.
- `/books/:entryId`: book details with source attribution, favorites, reading lifecycle/history, per-reading ratings, private journal entries, and archive/restore. The optional `?reading=<experienceId>` opens a reading from the loaded history.
- `/diary`: chronological reading diary with recorded dates, per-reading ratings, status filters, and personal statistics derived from actual library and reading records.
- `/catalog/search`: Open Library search, source-labeled results, individual addition feedback, and private manual entry. Supports `?q=...` and `?manual=true`.
- `/settings`: persisted display name, account details and a truthful privacy summary.
- `/about` and `/privacy`: public product and current-data-handling information.
- `/collections` and `/advisor`: clearly labeled upcoming features.

There are no fabricated library records, live seller offers, AI interactions, account-deletion controls, or fake social-login buttons. Original typographic cover illustrations are decorative, not publisher-provided artwork. Reader data screens render actual API responses.

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

## Pagination and statistics

- The library follows up to five cursor pages of 100 records, loading at most **500 books**, including archived entries. When more records remain, the interface explicitly limits its counts, search, and filters to the loaded books. Metadata requests run in bounded batches.
- The diary loads at most **100 recently saved books** and the latest **100 reading experiences per book**. If any cursor indicates more records, a visible notice explains that the statistics cover loaded records rather than complete lifetime totals. Per-book reading history and journal lists offer controls to load earlier cursor pages.
- Finished books are counted once; rereads retain separate ratings. The average uses recorded per-reading ratings, and the yearly finished-read count uses recorded finishing dates. Undated experiences are labeled “Date not recorded”; no dates, streaks, or statistics are fabricated. Reading history includes archived books, while the current shelf and currently-reading counts exclude archived books.

Liveness status describes only API connectivity, not database/provider readiness. Requests have bounded cold-start timeouts. The new reading and journal screens require the corresponding Java endpoints and the reviewed additive database migration before release.
