# V5 — Community book preview before saving

Status: draft PR #12; production remains V4 pending review.

## User journey
Discover → select a result cover/title → /discover/works/:workId → community impressions → Add to my library.
Work identity uses the canonical KTOB Open Library work UUID, never fuzzy title matches.
Decorative book art is labeled as original KTOB artwork, not a publisher cover.
Community ratings and per-note published reviews can be viewed before saving the book.
All public note bodies are collapsed until independently revealed because there is no per-note spoiler classification yet.
Add uses the existing private library operation and handles duplicates honestly.

## Privacy guarantees
The new GET /api/v1/catalog/works/{workId}/community endpoint requires verified user authentication.
Only unowned global Open Library works are eligible; private manual works return 404.
Only discoverable profiles with a username, non-archived library entries, public rating flags and explicitly published journal notes qualify.
One latest reading per eligible reader contributes to the average; newer private/unrated readings do not reveal older public scores.
The response contains public username, chosen display name, permitted rating or individually published note text only.
No private journal bodies, internal reader IDs, email, consent states, or hidden profiles are serialized.
Publication revocations affect subsequent API requests immediately; previously loaded browser pages require refresh.

## Verification gates
Backend disposable PostgreSQL tests: hidden profiles, manual-work 404, unpublished note isolation, latest-reading rating de-duplication, revocation, anonymous rejection.
Frontend tests: discovery navigation, private shelf addition, spoiler reveal/hide, inert note content, empty/social-error states.
Run Java/Angular tests, full integrated CI, OpenAPI synchronization, Docker checks and Vercel preview before production promotion.
Use no fake user reviews, no automatic publication of profiles or notes, and no destructive production schema changes.

## Deferred
Per-note spoiler metadata; reactions/follows; public-to-internet access; popularity ranking.
