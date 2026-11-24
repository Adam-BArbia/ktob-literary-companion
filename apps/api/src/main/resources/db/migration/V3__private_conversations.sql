-- Additive V3: private conversations and atomic, replayable AI turns.
-- No existing reader row is changed. Apply using the reviewed migration identity.
CREATE TABLE app.conversations (
    id uuid PRIMARY KEY,
    reader_id uuid NOT NULL REFERENCES app.reader_profiles(reader_id),
    kind varchar(16) NOT NULL,
    work_id uuid REFERENCES app.catalog_works(id),
    title varchar(160) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT conversation_owner_unique UNIQUE (id, reader_id),
    CONSTRAINT conversation_kind_work CHECK (
        (kind = 'GENERAL' AND work_id IS NULL) OR
        (kind = 'BOOK_MAIN' AND work_id IS NOT NULL)
    ),
    CONSTRAINT conversation_title CHECK (length(btrim(title, E' \t\r\n')) BETWEEN 1 AND 160)
);
CREATE INDEX conversations_owner_page_idx ON app.conversations(reader_id, created_at DESC, id DESC);
CREATE INDEX conversations_work_idx ON app.conversations(work_id) WHERE work_id IS NOT NULL;

CREATE TABLE app.conversation_messages (
    id uuid PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES app.conversations(id),
    turn_id uuid NOT NULL,
    role varchar(16) NOT NULL,
    body text NOT NULL,
    spoiler_level varchar(24) NOT NULL,
    full_book_spoilers_confirmed boolean,
    created_at timestamptz NOT NULL,
    CONSTRAINT message_conversation_unique UNIQUE (id, conversation_id),
    CONSTRAINT message_turn_role_unique UNIQUE (turn_id, role),
    CONSTRAINT message_role CHECK (role IN ('READER','ASSISTANT')),
    CONSTRAINT message_body CHECK (length(btrim(body, E' \t\r\n')) > 0 AND
        length(body) <= CASE WHEN role='READER' THEN 12000 ELSE 16000 END),
    CONSTRAINT message_spoiler CHECK (spoiler_level IN ('NO_SPOILERS','FULL_BOOK_SPOILERS')),
    CONSTRAINT message_confirmation CHECK (
        (role='ASSISTANT' AND full_book_spoilers_confirmed IS NULL) OR
        (role='READER' AND full_book_spoilers_confirmed IS NOT NULL AND
            full_book_spoilers_confirmed = (spoiler_level='FULL_BOOK_SPOILERS'))
    )
);
CREATE INDEX conversation_messages_page_idx
    ON app.conversation_messages(conversation_id, created_at DESC, id DESC);

-- Retained with the conversation (at least 24h); contains hashes/IDs, not copies of prompts.
CREATE TABLE app.message_idempotency (
    reader_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    request_key uuid NOT NULL,
    request_hash varchar(64) NOT NULL,
    reader_message_id uuid NOT NULL,
    assistant_message_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (reader_id, conversation_id, request_key),
    CONSTRAINT idempotency_owner_fk FOREIGN KEY (conversation_id, reader_id)
        REFERENCES app.conversations(id, reader_id),
    CONSTRAINT idempotency_reader_message_fk FOREIGN KEY (reader_message_id, conversation_id)
        REFERENCES app.conversation_messages(id, conversation_id),
    CONSTRAINT idempotency_assistant_message_fk FOREIGN KEY (assistant_message_id, conversation_id)
        REFERENCES app.conversation_messages(id, conversation_id),
    CONSTRAINT idempotency_hash CHECK (request_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT idempotency_distinct_messages CHECK (reader_message_id <> assistant_message_id)
);
CREATE INDEX message_idempotency_reader_message_idx ON app.message_idempotency(reader_message_id, conversation_id);
CREATE INDEX message_idempotency_assistant_message_idx ON app.message_idempotency(assistant_message_id, conversation_id);

REVOKE ALL ON app.conversations, app.conversation_messages, app.message_idempotency FROM PUBLIC;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
        REVOKE ALL ON app.conversations, app.conversation_messages, app.message_idempotency FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
        REVOKE ALL ON app.conversations, app.conversation_messages, app.message_idempotency FROM authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ktob_app') THEN
        REVOKE ALL ON app.conversations, app.conversation_messages, app.message_idempotency FROM ktob_app;
        GRANT SELECT, INSERT ON app.conversations, app.conversation_messages, app.message_idempotency TO ktob_app;
        -- SELECT FOR UPDATE needs UPDATE on at least one column; no delete or schema privileges.
        GRANT UPDATE(title) ON app.conversations TO ktob_app;
    END IF;
END $$;
