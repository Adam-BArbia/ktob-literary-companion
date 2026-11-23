# KTOB web app

Angular 22 + Tailwind CSS 4, with a standalone, lazy-loaded route structure and real Supabase email/password authentication. The browser calls the Java API for reader, catalog, and library data; it never connects directly to the private database schema.

## Current screens

- `/`: editorial home with clear library/discovery actions and explicitly curated reading inspiration.
- `/auth`: sign in, confirmation recovery and safe internal return navigation.
- `/auth/sign-up`: dedicated registration with email, password, confirmation, field-linked errors, and a verification-email state. `/sign-up` redirects here.
- `/library`: private shelf with title/author filtering, grid/list layout, archive confirmation, restore and undo.
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

See [the UI design guide](../../docs/implementation/16-ui-design-guide.md). Shared colors, text styles, controls and feedback live in `src/styles.css`; SVG icons, decorative covers and the home hero are shared components. Forms use real HTML labels and field-associated validation, the mobile navigation supports Escape, native archive dialogs preserve keyboard focus, reduced motion is respected, and navigation restores scroll/focus.

The Java API currently returns at most 25 library records without paging; the library explicitly discloses that limit when reached and scopes its filters to loaded records. Liveness status describes only API connectivity, not database/provider readiness. Requests have bounded cold-start timeouts.
