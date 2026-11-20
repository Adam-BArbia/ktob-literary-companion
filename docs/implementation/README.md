# KTOB — Implementation Handoff (2026-11-20)

**Status:** IMPLEMENTATION-READY BASELINE for the user-approved R1 core, **not implemented or deployed**. Begin coding from [Sprint 0](10-sprint-backlog.md) after pulling the repository. Do not present unselected AI/seller providers or unapproved account deletion as operational.

This directory transforms the approved [Gate B product decisions](../architecture/08-gate-b-decision-review.md), [16 UML models](../uml/README.md), [OpenAPI 3.1 v0.3](../architecture/openapi.json) and [conceptual persistence design](../architecture/03-persistence-model.md) into a sequential implementation contract.

## Required reading order

| # | Document | Ownership |
|---|---|---|
| 01 | [Delivery scope and staged releases](01-scope-and-delivery-plan.md) | Release boundaries, definitions of done |
| 02 | [Repository and module architecture](02-repo-structure-and-modules.md) | Code organization and dependency rules |
| 03 | [PostgreSQL/Flyway schema blueprint](03-database-migration-blueprint.md) | Tables, constraints, migrations (not SQL) |
| 04 | [API implementation rules](04-api-implementation-contract.md) | REST/JSON, error, pagination and lifecycle behavior |
| 05 | [Angular routes and UX acceptance](05-angular-routes-and-ux.md) | Screens and interaction states |
| 06 | [Security, privacy and authorization](06-security-and-privacy.md) | Security invariants, sensitive data controls |
| 07 | [External adapter specifications](07-provider-adapters.md) | Open Library, AI and offer-provider fail-closed design |
| 08 | [Windows environment and deployment](08-local-dev-ci-deploy.md) | Java, Angular, test, environments, operations |
| 09 | [Quality and acceptance evidence](09-test-and-acceptance-plan.md) | Automated tests and manual checks |
| 10 | [Sprint backlog and task order](10-sprint-backlog.md) | Implementation tasks and dependencies |
| 11 | [Unresolved decisions and risks](11-risk-and-decision-register.md) | Provider, deletion, academic evidence |
| 12 | [First implementation handoff](12-start-implementation-checklist.md) | Exactly where to begin |

## Source-of-truth and change control

- **API source of truth:** `docs/architecture/openapi.json` (35 paths, 57 operations, version 0.3.0). Keep compatibility tests and client DTOs derived from it. No undocumented endpoints; update the API contract and regression suite before adding/removing operations.
- **Domain rules:** [architecture ADRs](../architecture/01-architecture-decisions.md), [library UML](../uml/02-domain-library.puml), [advisor UML](../uml/03-domain-advisor.puml), [traceability](../architecture/07-consistency-matrix.md).
- **PostgreSQL design:** this handoff is a **blueprint**, not executable migrations. Build migrations in implementation according to the chosen toolchain and test before deployment. Never edit the connected production database during documentation handoff.
- **Privacy:** only Supabase Auth is browser-facing; Spring Boot controls all business tables in a non-exposed `app` schema. All private requests are checked against the verified reader identity.
- **Engineering scope:** first get an integrated, demonstrable path: Angular → Java REST → Open Library and authenticated Java ↔ PostgreSQL. Then cover the rest of the approved R1 core.
- **External dependencies:** AI provider B16, verified Tunisian seller research B15, and full account deletion policy B13 remain separate gates. Their adapters/contracts can be built, but cannot be called functioning integrations or active deletion before review.

## Completion criteria of this handoff

1. All references point to real files and the accepted API operations.
2. Readable code layout, database entities/constraints, UI routes, security rules and test cases are specified.
3. No silent deletion of approved core behavior or inaccurate provider guarantees.
4. CI validates UML syntax/rendering, OpenAPI/JSON Schema and design consistency.
5. The [first-sprint checklist](12-start-implementation-checklist.md) identifies an unambiguous starting point.

This is sufficient to **start local application implementation**; it is not a claim that feature delivery, security audits, academic rubric verification, or provider selection has already occurred.
