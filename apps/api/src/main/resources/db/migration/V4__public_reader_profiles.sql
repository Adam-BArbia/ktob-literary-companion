-- V4: opt-in reader discovery, public-by-default NEW ratings, per-note publication.
-- Existing profiles remain undiscoverable; existing ratings and every existing note remain private.
-- Apply as reviewed additive migration only. Never use automatic production Flyway.
ALTER TABLE app.reader_profiles
    ADD COLUMN username varchar(24),
    ADD COLUMN discoverable boolean NOT NULL DEFAULT false;
ALTER TABLE app.reader_profiles
    ADD CONSTRAINT reader_username_format CHECK (
        username IS NULL OR username ~ '^[a-z][a-z0-9_]{2,23}$'
    ),
    ADD CONSTRAINT discoverable_requires_username CHECK (
        NOT discoverable OR username IS NOT NULL
    );
CREATE UNIQUE INDEX reader_username_unique_idx ON app.reader_profiles (lower(username))
    WHERE username IS NOT NULL;
CREATE INDEX reader_discovery_idx ON app.reader_profiles (username)
    WHERE discoverable;

-- Grandfather ALL existing ratings as private. New reading experiences default to public.
ALTER TABLE app.reading_experiences
    ADD COLUMN rating_public boolean NOT NULL DEFAULT false;
ALTER TABLE app.reading_experiences
    ALTER COLUMN rating_public SET DEFAULT true;

-- Every journal entry, new and existing, starts private independently.
ALTER TABLE app.journal_entries
    ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- The app schema and business tables stay inaccessible to anon/authenticated roles.
REVOKE ALL ON app.reader_profiles, app.reading_experiences, app.journal_entries FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON app.reader_profiles, app.reading_experiences, app.journal_entries FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON app.reader_profiles, app.reading_experiences, app.journal_entries FROM authenticated;
  END IF;
END $$;
