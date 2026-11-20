# First implementation handoff — exactly what to do next

## Ready for the first coding session

- [x] Product default decisions B01–B12/B14 approved by user.
- [x] UML: 16 named PlantUML sources in `docs/uml`.
- [x] API v0.3.0: 35 paths / 57 operations with JSON Schema.
- [x] Architecture and consistency matrix present.
- [x] DB entity/constraint and migration order blueprint present.
- [x] Java module and Angular feature structure proposed.
- [x] Security, consent, spoilers, archives, read experiences covered.
- [x] Windows development/deployment instructions specified.
- [x] Test matrix, demo evidence and backlog ordered.
- [x] **KTOB-001:** Java 21 / Spring Boot 4.1.3 API scaffold, Maven Wrapper, `GET /api/v1/health`, integration/context tests and backend CI added under `apps/api`.
- [ ] KTOB-002 Angular app scaffold and complete Sprint 0 CI remain to be built.
- [ ] AI provider, live seller provider, full account deletion **remain gated**.
- [ ] Complete professor rubric and validation date **not independently verified**.

## Next action: implement Sprint 0, not Sprint 4

1. In Windows CMD: `cd /d C:\dev\ktob-literary-companion`; `git pull origin main`; `where java`; `java -version`; ensure Java **21** (not older Java 8 on PATH).
2. Verify supported Node version for Angular 22: `node -v`, `npm -v`; upgrade if needed. Do not install random unpinned tools before verifying compatibility.
3. Create Java Spring Boot API under `apps/api` with Maven wrapper, tests, `GET /api/v1/health` and proper `ProblemDetail` handling.
4. Create Angular app under `apps/web` with standalone router, basic shell, build and test.
5. Commit CI builds for both apps and a reproducible `.env.example`/config table with **placeholder values only**.
6. Demonstrate backend health from CMD and browser shell without relying on AI/vendor keys; this is Sprint 0 complete.

## Implementation stop conditions

- No Spring Boot 4.1 patch build available / incompatible starter artifact: resolve version against official Spring dependency management before adding code.
- Java 8 still first on `PATH`: fix PATH/JAVA_HOME before running Maven.
- A private database configured with production user data only: use disposable/staging DB for migrations/tests.
- Any desire to enable live AI/delete accounts/live seller search: first resolve B16/B13/B15 with provider/policy evidence.
- CI fails: do not report completion or deploy; fix tests first.

## What the docs **do** and **do not** authorize

They are an **engineering handoff** to begin Sprint 0 and safe first-party work. They do not mean the entire consumer-facing release is implemented, audited or legally cleared. For public launch, the team must check provider decisions, retention/backups, real authentication/IDOR tests, and current hosting quotas.

**Start with KTOB-001** (backend scaffold + health route), then **KTOB-002** (Angular scaffold). The first integration target is **KTOB-105/KTOB-106** (reader adds an Open Library work through Java to personal library).
