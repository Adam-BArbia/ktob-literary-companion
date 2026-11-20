# KTOB — UML Model Set

All diagrams are **PlantUML** sources (`.puml`): standard UML diagram types, not Mermaid. The model is a **reviewable design baseline**, not an implementation or database migration. Render with PlantUML (IDE plugin, PlantUML CLI, or approved offline renderer).

## Diagrams

| View | Diagram | Purpose |
|---|---|---|
| 01 | [System use cases](01-use-cases.puml) | Reader-facing functional scope |
| 02 | [Core domain classes](02-domain-library.puml) | Works, editions, journals, collections, acquisitions |
| 03 | [AI/privacy domain classes](03-domain-advisor.puml) | Conversations, consent, boundaries, memories, recommendations |
| 04 | [Component architecture](04-components.puml) | Logical responsibility and external boundaries |
| 05 | [Deployment](05-deployment.puml) | Angular/Vercel, Spring/Render, Supabase and providers |
| 06 | [Packages](06-packages.puml) | Allowed module dependencies |
| 07 | [Sequence: book entry](07-sequence-add-book.puml) | Catalog search and manual fallback |
| 08 | [Sequence: journal/reread](08-sequence-reading-journal.puml) | Independent reading sessions and journal privacy |
| 09 | [Sequence: recommendation](09-sequence-recommendation.puml) | Personalization opt-in and firm boundaries |
| 10 | [Sequence: conversation/memory](10-sequence-memory.puml) | No implicit permanent memory |
| 11 | [Sequence: acquisition](11-sequence-acquisition.puml) | Sourced offers and explicit ownership |
| 12 | [Sequence: data export](12-sequence-export.puml) | Private export of personal data |
| 13 | [Activity: reading journey](13-activity-reading-journey.puml) | End-to-end use and optional paths |
| 14 | [State machine: reading experience](14-state-reading.puml) | Reading status transitions |
| 15 | [State machine: AI memory proposal](15-state-memory.puml) | Draft, approved, dismissed, revoked |
| 16 | [State machine: saved offer](16-state-offer.puml) | Offered price is historical, not a purchase |

## Conventions and invariants

- `BookWork` is a literary work; `BookEdition` is an optional edition/format; `LibraryEntry` is a reader's link to a work; `ReadingExperience` represents a separate reading or rereading; `JournalEntry` belongs to a reading experience.
- `ReadingStatus`, acquisition/access, collections and favorites are **independent**.
- Personal information is isolated by `readerId`. Supabase Auth authenticates; the Java API must verify token and enforce ownership.
- Consent to AI processing is **opt-in**. A journal entry can independently exclude itself from personalization.
- `Conversation` is not `JournalEntry`; `ProposedMemory` is not `ApprovedMemory`. Long-term memory needs reader acceptance.
- Firm content boundaries cannot be created by AI inference, and only a reader's deliberate request may temporarily override them.
- Missing or unreliable catalog metadata, warnings, prices or seller availability must not be invented.
- A saved offer or clicked seller link never automatically records acquisition; acquisition never automatically changes reading status.
- Prior reading experiences survive rereads.
- Labels ending **[EXT]** represent external actors/services; **[OPTIONAL]** and **[R2]** denote conditional or deferred scope.
- These are UML **domain concepts**, not prescribed SQL table names or final API endpoints.

## Release and architecture decisions

**R1 Complete Core Experience (B):** private readers, optional onboarding, library, collections, multiple reading experiences, journal, general/book conversation, recommendations, AI memory approval, content boundaries, basic export, sourced offer saving and acquisition history.

**R2:** in-depth edition comparisons, advanced author browsing, multiple topic discussions per book, advanced exports/imports, price alerts and lending analytics.

**Deployment baseline:** Angular on Vercel, Spring Boot on Render Free, Supabase PostgreSQL + Auth. One **modular** Spring Boot deployable initially, not five independent microservices. Logical modules are not separate runtime nodes. Java service exposes REST/JSON provisionally. The assignment's exact SOAP-versus-REST requirement remains unverified.

**External dependencies:** Open Library proposed for bibliographic discovery; Groq Free is provisional and needs availability/privacy checks; live seller/price research provider is **unselected**, so the diagram includes an explicit verified-source prerequisite and an empty-results fallback.

## Review / approval gates

1. Verify exact professor assignment wording, especially SOAP/REST and whether independently deployed services are required.
2. Approve cardinalities, data ownership and lifecycle semantics before writing entities, APIs or SQL.
3. Validate availability/usage constraints of the external AI and offer research providers.
4. Render and inspect every diagram with a PlantUML renderer before final UML sign-off.
5. Only after approval: service contracts, persistence details, and application implementation.

## Traceability

- Functional baseline: FR-01..FR-46, acceptance criteria AC-01..AC-20 from the KTOB requirements discussion.
- Main use cases include personal library, reading and reflection, recommendation, conversation and memory, discovery, acquisition and export.
- Security is part of every private use case, not only a UI concern.


## VS Code preview and diagnostics

Use **PlantUML** by *jebbs* (extension ID `jebbs.plantuml`) to preview `.puml` files.
**Plan UML Preview** (`justuskarlsson.plan-uml`) is a *different* extension with its own Java/JAR renderer.
Its "Failed to generate SVG" may occur even when the diagrams are valid.

1. In Extensions (`Ctrl+Shift+X`), enable `jebbs.plantuml` and disable
   **Plan UML** (`justuskarlsson.plan-uml`) **for this workspace**.
2. Open a `.puml` diagram and press **Alt+D** to start jebbs's preview.
3. If local rendering fails, check `java -version` in Command Prompt.
   The jebbs Windows extension normally bundles a PlantUML JAR; Graphviz may be necessary.
4. The GitHub **Actions** workflow validates PlantUML syntax and renders all 16 diagrams to SVG.

All 16 files have explicit named `@startuml KTOB_...` declarations to remove
"Diagram unnamed" lint warnings. These are distinct from Java/JAR runtime errors.

Do not send private diagrams to public PlantUML servers without approval.
