# V5 — Community book preview before saving

Implementation and pre-deployment hardening: PR #12.

## User journey
Discover → select a result cover/title → /discover/works/:workId → community impressions → Add to my library.
Work identity uses the canonical KTOB Open Library work UUID, never fuzzy title matches.
Decorative book art is labeled as original KTOB artwork, not a publisher cover.
Community ratings and per-note published reviews can be viewed before saving the book.
All public note bodies are collapsed until independently revealed because there is no per-note spoiler classification yet.
Add uses the existing private library operation and handles duplicates honestly.
Book details and the Add action remain available while the community section loads or retries.
Responses from an earlier route cannot change the next book's saved state or community content.
Back to Discover preserves the search query, and the Discover navigation remains active on previews.

## Privacy guarantees
The new GET /api/v1/catalog/works/{workId}/community endpoint requires verified user authentication.
Only unowned global Open Library works are eligible; private manual works return 404.
Only discoverable profiles with a username, non-archived library entries, public rating flags and explicitly published journal notes qualify.
One latest reading per eligible reader contributes to the average; newer private/unrated readings do not reveal older public scores.
The response contains public username, chosen display name, permitted rating or individually published note text only.
No private journal bodies, internal reader IDs, email, consent states, or hidden profiles are serialized.
Publication revocations affect subsequent API requests immediately; previously loaded browser pages require refresh.
Each response uses one read-only database snapshot so concurrent sharing edits cannot produce inconsistent lists and aggregates.
The average and count cover all eligible readers. The displayed rating list is capped at 200 and the newest-note preview at 30; the UI labels these limits.

## Verification gates
Backend disposable PostgreSQL tests: hidden profiles, manual-work 404, unpublished note isolation, latest-reading rating de-duplication, revocation, anonymous rejection, archive removal, identical-title work isolation, multi-reader averages, and display limits.
Frontend tests: discovery navigation and preserved queries, private shelf addition, spoiler reveal/hide, inert note content, empty/social-error states, delayed community responses, retry behavior, and stale Add responses after navigation.
Run Java/Angular tests, full integrated CI, OpenAPI synchronization, Docker checks and Vercel preview before production promotion.
Use no fake user reviews, no automatic publication of profiles or notes, and no destructive production schema changes.

## Deployment and recovery
No migration, dependency change, secret rotation, or hosting configuration change is required.
Merge only after checks pass on the final PR commit. The existing main-branch integrations deploy Angular to `ktob-web-front` on Vercel and Java to `ktob-api` on Render.
Wait for both providers to report the merged commit; a ready frontend preview alone does not verify the new API.
Run the production public smoke workflow (including book-preview deep links and anonymous/invalid-token rejection), verify live API health, and inspect bounded error logs.
Use an existing authenticated session to verify the Discover → preview journey, spoiler controls, reader links, and shelf action when available. Never publish personal content or weaken authentication to create a test fixture.
If rollback is needed, restore the preceding Vercel and Render production deployments; no database rollback is necessary.

## Deferred
Per-note spoiler metadata; reactions/follows; public-to-internet access; popularity ranking.
