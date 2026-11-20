# Delivery scope, milestones and definition of done

## Product intent

KTOB — *Keep Thoughts On Books* — is an owner-private reading library, journal and contextual literary companion. The university SOA demonstration must show **a Java REST service produced by the team**, **Angular consuming that service**, and **the Java service consuming a free external book API**. Based on the user-shared wording `SOAP ou REST`, REST is permissible; the full grading rubric/deadline is not in the repository.

## Incremental scope (DO NOT claim unavailable capabilities as live)

| Release milestone | Included | Proof |
|---|---|---|
| M0 — Workspace and engineering baseline | Java 21 Spring Boot app, Angular 22 app, Maven wrapper, format/lint/tests, GitHub CI, env templates, no secrets | Clean local launch and CI |
| M1 — SOA vertical slice | Supabase Auth validation, profile, Open Library-backed book search, catalog fallback, add work to owner library; Angular wired to Java | Recorded browser → Java → Open Library trace; Java independent request works |
| M2 — Reading core | Library GET/PATCH/archive/restore; reading experiences/rereads, journals with exclusions, collections, rating 1–5 step 0.5 and progressPercent 0–100 | Two-owner security tests, lifecycle tests, UI CRUD |
| M3 — Privacy and essentials | Privacy controls, content boundaries/preferences, JSON essentials export, owned saved offers/acquisitions and source provenance | Export scope, archive read-only policy, historical provenance, no fake live listings |
| M4 — AI adapter and honest degraded UX | Conversations/recommendations/memory approval, optional spoiler policy and strict consent gate behind a configurable AI adapter | With no provider: truthful `503` and no outbound call; with approved provider: language/privacy/limit tests |
| M5 — Release/demo verification | Vercel + Render + Supabase configuration, cold-start resilience, observability, demo script, documentation traces | Reproducible evaluator demo, tests, no leaked secrets |
| Provider follow-on | Verified Tunisia-first seller lookup and full account deletion | **BLOCKED** pending approved provider/retention policies; not silently completed |

**Do not silently drop:** B09 consent separation, journal exclusion, full-book-spoiler per-request confirmation, memory approval, explicit pricing provenance, non-destructive archive and reread history. A demonstrable M1 or M2 **is not** the entire promised Complete Core Experience.

## Hard domain invariants

1. Library entry unique per (reader,work), including archived; one global vs creator-private work namespace.
2. A never-started work has shelf `WANT_TO_READ` with zero reading experiences. A reading experience never stores that state.
3. At most one open experience (READING/PAUSED) per library entry; rereads preserve prior records.
4. Rating is optional 1–5 half-step; progressPercent optional integer 0–100, never auto-transitions status.
5. Archiving preserves all child data; archived entry remains owner-readable, descendant mutations return `409 LIBRARY_ENTRY_ARCHIVED`; restore reveals existing memberships.
6. No external AI call without processing opt-in; personal history requires separately enabled personalization and scoped opt-ins; excluded journal never sent.
7. `NO_SPOILERS` default; `FULL_BOOK_SPOILERS` requires explicit same-request confirmation; earlier full-spoiler turns filtered from later NO_SPOILERS context. No guaranteed perfect model safety.
8. Strict content boundaries apply even in SURPRISE mode. Unknown metadata is not evidence a candidate is safe.
9. Approved memories require explicit choice; revoked memories never reactivated.
10. Saved offer observation is immutable, saving or clicking isn't acquisition; never invent vendors/prices/stock.
11. Owner's R1 export contains exactly library, experiences, journal, collections, preferences; label **essentials export**, not full data portability.
12. No DELETE /me until a reviewed account deletion/retention procedure exists.

## Definition of done for each vertical slice

Code peer-reviewed, reproducible setup, tests passing, no hardcoded keys; OpenAPI operation works with realistic responses and error branches; two-reader IDOR tests; the UI demonstrates success/empty/loading/validation/offline states; changes appear in a small PR with linked acceptance cases. For SOA demonstration, present successful normal and unavailable external lookup without using fabricated upstream results.

## Completion versus authorization

This handoff authorizes **planning and beginning work on M0–M3 and non-live adapters** as the implementation-ready core. It does *not* authorize deletion operations, third-party AI transmissions, or live seller claims. Full release readiness requires acceptance tests and independent provider decisions.
