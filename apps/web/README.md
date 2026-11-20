# KTOB Angular 22 Frontend — KTOB-002

This is the responsive Angular 22 + Tailwind CSS 4 UI shell for **Keep Thoughts On Books**. It is a genuine Angular SPA with navigation and a real HTTP health probe, not a completed library or an authentication system.

## Features implemented

- Responsive editorial layout with desktop top navigation and an interactive keyboard-accessible mobile menu
- Angular router: Home, Library, Discover, Collections, Advisor, Settings
- Honest placeholder screens for future modules; no mocked book records
- Runtime-configured `GET /api/v1/health` request through `HealthService`
- Loading, connected, unavailable and retry states in the footer
- Unit tests via Vitest and production build in CI
- No Supabase or third-party AI integration; no live bookstore claims or account deletion

## Development commands

Install Node 24.15+ (or a compatible supported Node version). Windows CMD:

```bat
cd /d C:\dev\ktob-literary-companion\apps\web
npm ci
npm start
```

Open `http://localhost:4200`. In a second window run the Java backend using `apps\api\mvnw.cmd spring-boot:run`. The SPA reads `public/ktob-config.json` and requests `http://localhost:8080/api/v1/health`. Local development CORS for the health endpoint is explicitly limited to `http://localhost:4200`.

Run tests and release compilation:

```bat
npm test -- --watch=false
npm run build
```

## Deployment configuration (not deployed yet)

The frontend loads a public `/ktob-config.json` file at runtime. A production build must write a real backend URL before building:

```bat
set "KTOB_API_URL=https://YOUR-JAVA-API-HOST/api/v1"
node scripts/configure-api.mjs
npm run build
```

`KTOB_API_URL` is a public browser-visible URL, not a secret. The build-time configuration must point to the reachable hosted Java API. **Never publish the default localhost URL as the final production configuration.** Render's `ALLOWED_WEB_ORIGINS` must include the exact Vercel origin; only the health endpoint supports that property at Sprint 0.

The `configure-api.mjs` script is intentionally separate from `npm run build` so documentation/tests cannot silently replace the local development config. Later Vercel deployment should use `node scripts/configure-api.mjs && npm run build` with the correct environment variable.

Backend/Angular authentication, business CRUD, Supabase storage, and live AI/sellers remain unimplemented. See the [implementation handoff](../../docs/implementation/README.md).

## Sprint 1 — authentication and reader workflows

The UI now has `/auth` for email/password sign-in/sign-up, protected `/library` and `/catalog/search`, and calls to actual Java endpoints. The app uses the official pinned Supabase JS v2 client. **Only public publishable credentials** are included in the browser config.

For a dedicated KTOB project, inject `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `KTOB_API_URL` into the build pipeline and run `node scripts/configure-api.mjs` prior to production build. Missing credentials intentionally disable sign-in. Do NOT reuse the existing Hani Maak Supabase instance.

The API needs its own verified `SUPABASE_ISSUER` and `SUPABASE_JWKS_URL` and reviewed JDBC connection to a private `app` schema. This is not yet configured or hosted.
