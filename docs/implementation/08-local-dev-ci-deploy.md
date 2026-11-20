# Local Windows setup, CI and eventual deployment

**No commands below have been run on the user's Windows machine during documentation handoff.** These are implementation preparation steps. Windows CMD is the primary user workflow; project path known from previous work is `C:\dev\ktob-literary-companion`.

## Toolchain versions / constraints (checked 2026-11-20)

- **Java JDK 21** via Eclipse Temurin; the machine previously installed Java 21 but `java -version` still resolved **Oracle Java 8** because older Oracle Java path preceded Adoptium in PATH. Resolve before Spring Boot implementation.
- **Spring Boot 4.1.x** stable track; choose a pinned current GA patch through `start.spring.io`, Spring release page and a tested Maven build. An official 4.1.3 release was announced 2026-11-20; do not use 4.2 milestone/RC in R1.
- **Angular 22.x** currently supported. Official Angular compatibility requires **Node ^22.22.3 OR ^24.15.0 OR ^26.0.0**, TypeScript `>=6.0.0 <6.1.0`. Use an exact supported Node LTS and project lockfile.
- PostgreSQL and Supabase Auth: choose actual project settings at setup. Java backend persistent on Render normally uses TLS session pooler when IPv4-only; verify URL details for chosen region/project.

Refs: https://spring.io/blog/2026/11/20/spring-boot-4-1-3-available-now/ ; https://angular.dev/reference/versions ; https://supabase.com/docs/guides/database/connecting-to-postgres

## Windows CMD: verify environment before generating app

```bat
cd /d C:\dev\ktob-literary-companion
git status
git pull origin main
where java
java -version
javac -version
mvn -version
node -v
npm -v
```

If Java 8 is first, point `JAVA_HOME` at the actual installed Adoptium `jdk-21...` root and put `%JAVA_HOME%\bin` **ahead of** Oracle Java 8 in *system PATH*; restart all CMD and VS Code windows; verify `where java` now reports JDK 21 first. Do not assume earlier successful `winget install` updated PATH precedence.

During implementation, commit Maven wrapper and npm lockfile; then use `apps\api\mvnw.cmd` and `npm ci` to ensure team reproducibility. Do not assume app paths exist until Sprint 0 creates them.

## Local Postgres / Supabase

Preferred initial testing: disposable local PostgreSQL container matching hosted major version, plus a test Supabase Auth configuration (or deterministic signed-JWT test issuer for local integration tests). Use real JWT checks against a nonproduction project only after configuring keys. Test fresh migrations from empty DB and rollback/restore strategy. NEVER point CI tests to production Supabase.

Required secrets as **placeholders**, not values:
- Angular public build config: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `KTOB_API_URL`.
- Java local/Render: `DATABASE_JDBC_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `SUPABASE_ISSUER`, `SUPABASE_JWKS_URL` when asymmetric signing, `ALLOWED_WEB_ORIGINS`, `OPENLIBRARY_CONTACT`, optional `AI_PROVIDER_KEY`, flags `AI_ENABLED=false`, `VERIFIED_OFFERS_ENABLED=false`.
- Never place database passwords, service-role keys, private JWT signing secrets or real AI keys in GitHub.

## Local start and validation order (after M0 scaffold exists)

1. Boot disposable PostgreSQL, configure local/test credentials and run reviewed Flyway migrations; confirm there is no business schema access through the publishable client.
2. Start Java: from `apps\api`, run `mvnw.cmd spring-boot:run` (or wrapper-supported equivalent after confirming build).
3. Independently verify GET `/api/v1/health` and one authenticated Java REST request; network trace must identify Java as source of business response.
4. Start Angular: from `apps\web`, run `npm ci`, then `npm start` once scripts exist. Verify frontend's API base URL and Supabase Auth.
5. Catalog search triggers Java → Open Library request; manual work fallback available on failure.
6. Run Java tests, Angular unit tests/build, UML/architecture checks and OpenAPI parser. No fake always-green test replacing missing integration.

## CI pipeline design for application code

Current GitHub Actions workflow validates **documentation only**. Implementation milestone M0 must add separate jobs:
- Java JDK21 dependency build, unit tests, formatting/static analysis, slice integration tests with disposable PostgreSQL, migrations tested from empty schema;
- Angular supported Node setup, `npm ci`, typecheck, unit tests, production build and accessibility smoke;
- OpenAPI spec validation and client/DTO compatibility (the existing `validate_contract.py`);
- secrets/dependency checks; branch protection requiring jobs.

Fail on tests, do not mark skipping tests as success. Provider live calls should be rare, explicit and not part of every CI build.

## Vercel + Render deployment when authorized

Deploy Angular static assets to Vercel and the single Java container/service to Render. Keep external base URLs and CORS configured for both production and explicitly allowed previews. Render may sleep on free tier; browser should show a cold-start retry/reconnect state, not an infinite spinner. Add bounded DB pool, JVM heap and request limits based on actual Render instance capacity (measure; do not invent concurrent-user guarantees). Validate TLS DB connection and JWKS/token verification in staging before public URL launch.

Use safe `/health` liveness; no database credentials or provider diagnostics returned. Database migrations run from controlled pipeline with reviewed permissions, **not** automatically as a destructive action on every app instance restart without policy. Require a deployment checklist and a separate production data-change approval for first live migration.
