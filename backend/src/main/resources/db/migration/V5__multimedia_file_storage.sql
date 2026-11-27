-- Offline demo content: binary media stored in PostgreSQL.
--
-- The bytes live in their own table so that listing multimedia metadata never
-- loads images or videos into memory.
--
-- Like V4, every statement is idempotent so that a database adopted at an older
-- baseline, but already holding this table, can still be migrated.

CREATE TABLE IF NOT EXISTS public.multimedia_file (
    multimedia_id integer NOT NULL,
    file_data bytea NOT NULL,
    file_name character varying(255) NOT NULL,
    content_type character varying(100) NOT NULL,
    file_size bigint NOT NULL,
    sha256 character varying(64) NOT NULL,
    CONSTRAINT multimedia_file_pkey PRIMARY KEY (multimedia_id),
    CONSTRAINT fk_multimedia_file_multimedia FOREIGN KEY (multimedia_id)
        REFERENCES public.multimedia (multimedia_id) ON DELETE CASCADE,
    CONSTRAINT ck_multimedia_file_size CHECK (file_size = octet_length(file_data))
);

-- Some development databases received file columns on `multimedia` by hand,
-- outside Flyway. Copy any bytes found there. The old columns are left in place
-- (unused) so that this migration never destroys data.
DO $$
BEGIN
    IF (
        SELECT count(*)
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'multimedia'
          AND column_name IN ('file_data', 'file_name', 'content_type')
    ) = 3 THEN
        EXECUTE $copy$
            INSERT INTO public.multimedia_file
                (multimedia_id, file_data, file_name, content_type, file_size, sha256)
            SELECT multimedia_id,
                   file_data,
                   COALESCE(NULLIF(file_name, ''), 'media-' || multimedia_id),
                   COALESCE(NULLIF(content_type, ''), 'application/octet-stream'),
                   octet_length(file_data),
                   encode(sha256(file_data), 'hex')
            FROM public.multimedia
            WHERE file_data IS NOT NULL
              AND octet_length(file_data) > 0
            ON CONFLICT (multimedia_id) DO NOTHING
        $copy$;
    END IF;
END $$;
