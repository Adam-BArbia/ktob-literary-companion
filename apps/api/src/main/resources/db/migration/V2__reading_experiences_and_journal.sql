-- Additive reading/journal release. Apply with a migration identity, never at runtime.
-- The parent/work composite reference prevents attaching a reading to another work's edition.
ALTER TABLE app.library_entries ADD CONSTRAINT library_entry_work_unique UNIQUE (id, work_id);

CREATE TABLE app.reading_experiences (
    id uuid PRIMARY KEY,
    library_entry_id uuid NOT NULL,
    work_id uuid NOT NULL,
    edition_id uuid,
    status varchar(24) NOT NULL,
    started_on date,
    finished_on date,
    rating numeric(2,1),
    progress_percent smallint,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reading_entry_work_fk FOREIGN KEY (library_entry_id, work_id)
        REFERENCES app.library_entries(id, work_id),
    CONSTRAINT reading_edition_work_fk FOREIGN KEY (edition_id, work_id)
        REFERENCES app.catalog_editions(id, work_id),
    CONSTRAINT reading_status CHECK (status IN ('CURRENTLY_READING','PAUSED','FINISHED','DID_NOT_FINISH')),
    CONSTRAINT reading_rating CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5 AND mod(rating, 0.5) = 0)),
    CONSTRAINT reading_progress CHECK (progress_percent IS NULL OR progress_percent BETWEEN 0 AND 100),
    CONSTRAINT reading_dates CHECK (started_on IS NULL OR finished_on IS NULL OR finished_on >= started_on)
);
CREATE UNIQUE INDEX reading_one_open_per_entry_idx ON app.reading_experiences(library_entry_id)
    WHERE status IN ('CURRENTLY_READING','PAUSED');
CREATE INDEX reading_entry_page_idx ON app.reading_experiences(library_entry_id, created_at DESC, id DESC);
CREATE INDEX reading_edition_work_idx ON app.reading_experiences(edition_id, work_id)
    WHERE edition_id IS NOT NULL;

CREATE TABLE app.journal_entries (
    id uuid PRIMARY KEY,
    experience_id uuid NOT NULL REFERENCES app.reading_experiences(id),
    kind varchar(16) NOT NULL,
    body text NOT NULL,
    emotion_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
    allow_for_personalization boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT journal_kind CHECK (kind IN ('REVIEW','REFLECTION','QUOTE','NOTE','EMOTION')),
    CONSTRAINT journal_body CHECK (length(body) <= 20000 AND length(btrim(body, E' \t\r\n')) > 0),
    CONSTRAINT journal_tags CHECK (cardinality(emotion_tags) <= 12 AND array_position(emotion_tags, NULL) IS NULL)
);
CREATE INDEX journal_experience_page_idx ON app.journal_entries(experience_id, created_at DESC, id DESC);

REVOKE ALL ON app.reading_experiences, app.journal_entries FROM PUBLIC;
-- Supabase-specific roles do not exist in disposable PostgreSQL. Explicitly revoke
-- default browser grants when present, and grant only required runtime operations.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON app.reading_experiences, app.journal_entries FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON app.reading_experiences, app.journal_entries FROM authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ktob_app') THEN
        REVOKE ALL ON app.reading_experiences, app.journal_entries FROM ktob_app;
        GRANT SELECT, INSERT, UPDATE ON app.reading_experiences TO ktob_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON app.journal_entries TO ktob_app;
    END IF;
END $$;
