# Decisions and architecture review gates

## Blocking academic input (must verify)

Obtain the actual university project rubric. Specifically determine whether **SOAP/WSDL** is mandatory, whether it requires a service registry, whether REST is allowed, whether the Java service must be distinct from the frontend, whether external service consumption must be demonstrated, and whether multiple *independently deployed* services are required. Lecture slides alone don't establish assessment requirements.

## Product decisions awaiting explicit sign-off

1. Rating scale and how unrated books display.
2. Minimum profile fields.
3. Exact AI processing consent and personalization scope granularity.
4. Visibility/identity of manually entered works (recommend private per reader).
5. Progress units per format (pages, %, minutes) and historical imports.
6. Essential export format for R1 (JSON first recommended), and later full archive formats.
7. Account deletion confirmation, reauthentication and retention strategy.
8. Warning provenance confidence levels and behavior of uncertain boundaries.
9. Whether `LibraryEntry.shelfStatus` derived from latest experience covers all shelf scenarios.
10. Provider availability and legality for Tunisian copy-finding, and exact AI model limits.

## Review checklist

- [ ] Confirm domain entities and UML multiplicities with the API models.
- [ ] Confirm every reader data type has an ownership path.
- [ ] Confirm create, update, delete, duplicate and error semantics of core endpoints.
- [ ] Confirm identity comes only from validated access token.
- [ ] Confirm AI processing and history personalization are separate permissions.
- [ ] Confirm no journal entry is shared with AI if excluded, regardless of global consent.
- [ ] Confirm rereads do not overwrite reading history or reviews.
- [ ] Confirm firm boundaries can be overridden only explicitly for one request.
- [ ] Confirm unsourced external offers cannot be misrepresented as verified.
- [ ] Confirm account deletion and export scope.
- [ ] Validate OpenAPI syntax and link it to acceptance tests.
- [ ] Confirm professor SOAP/REST/SOA demonstration criteria.
- [ ] Approve service contract **before** Spring Boot, Angular or SQL implementation.

## Milestones

**Gate A — Design draft (this commit):** UML + conceptual service contracts.

**Gate B — Architecture review:** resolve blockers, decide exact API payloads, DB constraints, consent and retention. Update and approve OpenAPI.

**Gate C — Implementation authorized:** only after Gate B, scaffold Spring Boot/Angular, prepare versioned Supabase migrations, then connect Vercel/Render deployments.

## Caution

The word *complete* here means the **document inventory** and proposed R1 architecture surface are covered. It does not mean the product specification, professor rubric, production security or external service feasibility has been independently approved.
