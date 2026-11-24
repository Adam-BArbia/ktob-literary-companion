# V4 opt-in reader discovery and per-entry publication

**Status: draft code; NOT DEPLOYED and NOT MIGRATED TO PRODUCTION.**

This feature is separate from the safe AI Markdown release (PR #10). Do not enable public sharing until all review gates pass.

## Privacy model

- A reader chooses a unique, public username and then explicitly turns on discoverability. Existing accounts remain undiscoverable.
- Only signed-in KTOB readers can search opted-in profiles. Email addresses, internal reader IDs, private manual catalog works and other internal fields are never returned from these API projections.
- New reading experiences have a public-by-default rating flag, which becomes visible ONLY if the owner's profile is discoverable. All pre-existing ratings are grandfathered private by the migration.
- Every journal entry, existing or new, has is_public=false by default. Publication is per entry; the owner must publish each individual note. A private note cannot become public by enabling profile discovery or AI personalization.
- Owners may revoke any single rating/note publication and turn off discovery at any time.
- Only canonical sourced Open Library works are eligible for shared ratings or notes. Archived entries are omitted from public views without deleting the owner's private history.

## Database migration

The reviewed candidate file is apps/api/src/main/resources/db/migration/V4__public_reader_profiles.sql.
It adds nullable unique usernames and discoverability to app.reader_profiles; rating_public (false for existing rows, true default for new rows) to app.reading_experiences; and is_public (false by default) to app.journal_entries.
It only adds columns, constraints, indexes and defensive browser-role revokes; no drops, deletes or resets.

Before production application: verify Supabase project afavrsrffoyctyvvpxcv, existing migration ledger, table privileges and constraints, current locks, rollback compatibility, and restoration options. Run disposable PostgreSQL tests first. Automatic Flyway must remain disabled in production. Apply only after explicit production safety approval and verify zero preexisting public ratings/notes and no discoverable readers.

## HTTP contract

The baseline approved 35-path/57-operation OpenAPI remains unchanged. Four additive endpoints are documented separately in docs/architecture/openapi-v4-extension.json and included in route-sync validation:
- GET /api/v1/me/public-profile
- PATCH /api/v1/me/public-profile
- GET /api/v1/readers/search?q=...
- GET /api/v1/readers/{username}

The existing experience/journal PATCH routes accept ratingPublic and isPublic fields. Readers retain ownership checks for writes; all public projections use fresh visibility conditions at read time.

## Acceptance gates

- Isolated disposable DB tests: two-reader isolation; profile hidden by default; opted-in search only; unpublish and hide take effect immediately; no private note/text leaks; no private manual-book exposure.
- Existing rating/note content remains private after migration; only new ratings default on. Per-note publication remains independent from AI consent.
- Owner can publish one note without exposing any others and undo publication.
- Documented API contracts and route registry pass; Angular UI and CSS budgets pass.
- Browser visual and functional tests pass on phone-sized and desktop widths.
- Rollback changes application deployment only. Never revert the database to an older state that discards new reader data.

**Do not merge or deploy this feature solely because CI succeeds. Production privacy/migration review remains a separate gate.**
