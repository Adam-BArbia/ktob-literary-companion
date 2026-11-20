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
- [x] KTOB-002 Angular 22 standalone web shell, Tailwind 4, navigation, typed health integration, unit tests, production build and web CI added.
- [x] KTOB-003: workspace-wide ignore rules, placeholder-only environment templates, Git-tracked secret hygiene validation.
- [x] KTOB-004: integrated Java/Angular build and test workflow with isolated PostgreSQL **service readiness only**. Actual migration/DB integration tests remain Sprint 1.
- [x] KTOB-005: RFC 9457 problem handling, response/list envelopes, validated pagination and UUID parsing, tests.
- [x] KTOB-006: implemented-operation synchronization; only `liveness` is currently registered, 56 operations remain planned.
- [ ] AI provider, live seller provider, full account deletion **remain gated**.
- [ ] Complete professor rubric and validation date **not independently verified**.

## Next action: proceed into Sprint 1 — authenticated SOA vertical slice

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

**Sprint 0 engineering foundation is implemented** (subject to the linked CI checks). Next milestone is KTOB-101 (actual Supabase Auth verification, with a staging-only configuration), KTOB-102 (disposable PostgreSQL migrations), and KTOB-104–106 (Java Open Library integration and frontend library workflow). The user will test only after hosting the finished app.
