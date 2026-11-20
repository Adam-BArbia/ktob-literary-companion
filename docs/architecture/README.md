# KTOB — Architecture & Service Contracts (draft v0.1)

**Stage:** pre-implementation architecture review. **Not approved for coding.**
This documentation refines the [16 PlantUML diagrams](../uml/README.md); the diagrams remain the conceptual source. This folder proposes implementable contracts without modifying application code, Supabase, Render or Vercel.

## Contents

1. [Architecture decisions and module boundaries](01-architecture-decisions.md)
2. [HTTP/API contract catalogue](02-api-contract.md)
3. [Conceptual PostgreSQL model](03-persistence-model.md)
4. [Authentication, access controls, AI consent](04-security-privacy.md)
5. [External integrations and deployment design](05-integrations-deployment.md)
6. [Open questions, acceptance and review gate](06-review-gates.md)
7. [Machine-readable OpenAPI draft](openapi.json)

## Agreed baseline

- **KTOB** = Keep Thoughts On Books.
- Frontend: **Angular + TypeScript + Tailwind**, deployed to **Vercel**.
- Backend: **Java 21 + Spring Boot**, deployed as **one modular service** on **Render Free**.
- Persistence: **Supabase PostgreSQL**, identity: **Supabase Auth**.
- Contract style: **REST + JSON provisional** until the professor's SOAP/REST conditions are verified.
- External bibliographic source: **Open Library API** with manual fallback.
- AI provider: **provisional** (Groq candidate); seller-price research source **unselected**.
- Initial release: **Complete Core Experience**, privacy-first. Deferred features are explicitly marked.

## Maturity labels

- **CONFIRMED**: a previously selected platform or product invariant.
- **PROPOSED**: contract or technical decision subject to review.
- **BLOCKED**: cannot claim working functionality until an external dependency or academic condition is verified.

**No endpoints below are deployed.** The paths and schemas are a *design proposal*, not a live API. Machine-readable OpenAPI is intended for review and consumer contract generation **after approval**.
