-- KTOB Sprint 1: private reader/catalog/library schema; disposable CI validated.
-- Supabase business schema MUST NOT be an exposed Data API schema.
-- Production: review GRANTs, migration identity and separate role before applying.
CREATE SCHEMA IF NOT EXISTS app;
REVOKE ALL ON SCHEMA app FROM PUBLIC;

CREATE TABLE app.reader_profiles (
    reader_id uuid PRIMARY KEY,
    display_name varchar(100) NOT NULL DEFAULT 'Reader',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT display_name_nonblank CHECK(length(btrim(display_name)) BETWEEN 1 AND 100)
);

CREATE TABLE app.privacy_settings (
    reader_id uuid PRIMARY KEY REFERENCES app.reader_profiles(reader_id),
    ai_processing_opt_in boolean NOT NULL DEFAULT false,
    personalization_opt_in boolean NOT NULL DEFAULT false,
    use_reading_history boolean NOT NULL DEFAULT false,
    use_allowed_journal boolean NOT NULL DEFAULT false,
    use_explicit_preferences boolean NOT NULL DEFAULT false,
    use_approved_memories boolean NOT NULL DEFAULT false
);

CREATE TABLE app.catalog_works (
    id uuid PRIMARY KEY,
    title text NOT NULL,
    authors text[] NOT NULL DEFAULT ARRAY[]::text[],
    origin varchar(20) NOT NULL,
    owner_reader_id uuid REFERENCES app.reader_profiles(reader_id),
    language varchar(12),
    catalog_reference varchar(100) UNIQUE,
    metadata_status varchar(16) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT work_origin CHECK(origin IN ('OPEN_LIBRARY', 'MANUAL')),
    CONSTRAINT work_metadata_status CHECK(metadata_status IN ('PARTIAL','AVAILABLE','UNKNOWN')),
    CONSTRAINT work_owner CHECK(
        (origin = 'OPEN_LIBRARY' AND owner_reader_id IS NULL AND catalog_reference IS NOT NULL)
        OR (origin = 'MANUAL' AND owner_reader_id IS NOT NULL AND catalog_reference IS NULL)
    ),
    CONSTRAINT work_title CHECK(length(btrim(title)) BETWEEN 1 AND 500)
);
CREATE INDEX catalog_works_owner_idx ON app.catalog_works(owner_reader_id, created_at DESC);

CREATE TABLE app.catalog_editions (
    id uuid PRIMARY KEY,
    work_id uuid NOT NULL REFERENCES app.catalog_works(id),
    isbn varchar(32),
    language varchar(12),
    format varchar(16),
    publisher text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(id, work_id),
    CONSTRAINT edition_format CHECK(format IN ('PRINT','EBOOK','AUDIOBOOK','OTHER') OR format IS NULL)
);

CREATE TABLE app.library_entries (
    id uuid PRIMARY KEY,
    reader_id uuid NOT NULL REFERENCES app.reader_profiles(reader_id),
    work_id uuid NOT NULL REFERENCES app.catalog_works(id),
    preferred_edition_id uuid,
    favorite boolean NOT NULL DEFAULT false,
    acquisition_intention boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz,
    UNIQUE(reader_id, work_id),
    CONSTRAINT edition_belongs_to_work FOREIGN KEY(preferred_edition_id,work_id)
        REFERENCES app.catalog_editions(id,work_id)
);
CREATE INDEX library_owner_page_idx
    ON app.library_entries(reader_id,archived_at,created_at DESC,id DESC);

REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA app FROM PUBLIC;
