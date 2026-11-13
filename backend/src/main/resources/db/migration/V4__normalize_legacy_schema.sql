-- Reconcile a database that was originally created by Hibernate with the
-- versioned migration baseline. Hibernate created the tables and columns but
-- did not create the Wave 3 indexes, checks, defaults, or the ON DELETE SET NULL
-- behaviour for visitor_interaction.beacon_id.
--
-- Every statement is intentionally idempotent. The same migration therefore
-- runs safely on:
--   * a fresh database created by V1..V3;
--   * an existing database that already ran V2/V3;
--   * a legacy Hibernate-created database adopted at baseline version 3.
--
-- No business data is rewritten or deleted. If existing beacon rows violate the
-- range checks, the migration fails visibly instead of silently skipping them.

CREATE INDEX IF NOT EXISTS idx_visitor_interaction_interacted_at
    ON public.visitor_interaction (interacted_at);

CREATE INDEX IF NOT EXISTS idx_visitor_interaction_visitor_id
    ON public.visitor_interaction (visitor_id);

CREATE INDEX IF NOT EXISTS idx_visitor_interaction_beacon_id
    ON public.visitor_interaction (beacon_id);

CREATE INDEX IF NOT EXISTS idx_beacon_artifact_id
    ON public.beacon (artifact_id);

ALTER TABLE public.beacon
    ALTER COLUMN enabled SET DEFAULT true;

DO $$
DECLARE
    existing_definition text;
    existing_validated boolean;
    normalized_definition text;
BEGIN
    SELECT pg_get_constraintdef(c.oid, true), c.convalidated
    INTO existing_definition, existing_validated
    FROM pg_constraint c
    WHERE c.conname = 'ck_beacon_major_range'
      AND c.conrelid = 'public.beacon'::regclass;

    IF NOT FOUND THEN
        ALTER TABLE public.beacon
            ADD CONSTRAINT ck_beacon_major_range
            CHECK (major BETWEEN 0 AND 65535);
    ELSE
        normalized_definition := lower(
            regexp_replace(
                regexp_replace(existing_definition, '[[:space:]]', '', 'g'),
                '[()]', '', 'g'
            )
        );

        IF normalized_definition NOT IN (
                'checkmajor>=0andmajor<=65535',
                'checkmajor<=65535andmajor>=0'
        ) THEN
            RAISE EXCEPTION USING
                MESSAGE = 'ck_beacon_major_range on public.beacon does not enforce major BETWEEN 0 AND 65535',
                DETAIL = format(
                    'Found: %s. Refusing to replace an existing constraint automatically.',
                    existing_definition
                ),
                HINT = 'Drop or fix the constraint manually, then rerun V4.';
        END IF;

        IF NOT existing_validated THEN
            ALTER TABLE public.beacon
                VALIDATE CONSTRAINT ck_beacon_major_range;
        END IF;
    END IF;
END $$;

DO $$
DECLARE
    existing_definition text;
    existing_validated boolean;
    normalized_definition text;
BEGIN
    SELECT pg_get_constraintdef(c.oid, true), c.convalidated
    INTO existing_definition, existing_validated
    FROM pg_constraint c
    WHERE c.conname = 'ck_beacon_minor_range'
      AND c.conrelid = 'public.beacon'::regclass;

    IF NOT FOUND THEN
        ALTER TABLE public.beacon
            ADD CONSTRAINT ck_beacon_minor_range
            CHECK (minor BETWEEN 0 AND 65535);
    ELSE
        normalized_definition := lower(
            regexp_replace(
                regexp_replace(existing_definition, '[[:space:]]', '', 'g'),
                '[()]', '', 'g'
            )
        );

        IF normalized_definition NOT IN (
                'checkminor>=0andminor<=65535',
                'checkminor<=65535andminor>=0'
        ) THEN
            RAISE EXCEPTION USING
                MESSAGE = 'ck_beacon_minor_range on public.beacon does not enforce minor BETWEEN 0 AND 65535',
                DETAIL = format(
                    'Found: %s. Refusing to replace an existing constraint automatically.',
                    existing_definition
                ),
                HINT = 'Drop or fix the constraint manually, then rerun V4.';
        END IF;

        IF NOT existing_validated THEN
            ALTER TABLE public.beacon
                VALIDATE CONSTRAINT ck_beacon_minor_range;
        END IF;
    END IF;
END $$;

DO $$
DECLARE
    local_beacon_id smallint;
    foreign_beacon_id smallint;
    unexpected_fk_name text;
    unexpected_fk_definition text;
    wrong_fk record;
    exact_fk_name text;
    exact_fk_validated boolean;
BEGIN
    SELECT a.attnum
    INTO local_beacon_id
    FROM pg_attribute a
    WHERE a.attrelid = 'public.visitor_interaction'::regclass
      AND a.attname = 'beacon_id'
      AND NOT a.attisdropped;

    SELECT a.attnum
    INTO foreign_beacon_id
    FROM pg_attribute a
    WHERE a.attrelid = 'public.beacon'::regclass
      AND a.attname = 'beacon_id'
      AND NOT a.attisdropped;

    IF local_beacon_id IS NULL OR foreign_beacon_id IS NULL THEN
        RAISE EXCEPTION USING
            MESSAGE = 'Required beacon_id columns are missing from public.visitor_interaction or public.beacon',
            HINT = 'Run V1-V3 or repair the schema manually, then rerun V4.';
    END IF;

    SELECT c.conname, pg_get_constraintdef(c.oid, true)
    INTO unexpected_fk_name, unexpected_fk_definition
    FROM pg_constraint c
    WHERE c.conrelid = 'public.visitor_interaction'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.beacon'::regclass
      AND NOT (
          c.conkey = ARRAY[local_beacon_id]::smallint[]
          AND c.confkey = ARRAY[foreign_beacon_id]::smallint[]
      )
    ORDER BY c.conname
    LIMIT 1;

    IF unexpected_fk_name IS NOT NULL THEN
        RAISE EXCEPTION USING
            MESSAGE = format(
                'Foreign key %I on public.visitor_interaction references public.beacon through unexpected columns',
                unexpected_fk_name
            ),
            DETAIL = format(
                'Found: %s. Expected visitor_interaction(beacon_id) -> beacon(beacon_id). Refusing to drop or replace an unrelated constraint.',
                unexpected_fk_definition
            ),
            HINT = 'Drop or fix the constraint manually, then rerun V4.';
    END IF;

    FOR wrong_fk IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.conrelid = 'public.visitor_interaction'::regclass
          AND c.contype = 'f'
          AND c.confrelid = 'public.beacon'::regclass
          AND c.conkey = ARRAY[local_beacon_id]::smallint[]
          AND c.confkey = ARRAY[foreign_beacon_id]::smallint[]
          AND c.confdeltype <> 'n'
        ORDER BY c.conname
    LOOP
        EXECUTE format(
                'ALTER TABLE public.visitor_interaction DROP CONSTRAINT %I',
                wrong_fk.conname);
    END LOOP;

    SELECT c.conname, c.convalidated
    INTO exact_fk_name, exact_fk_validated
    FROM pg_constraint c
    WHERE c.conrelid = 'public.visitor_interaction'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.beacon'::regclass
      AND c.conkey = ARRAY[local_beacon_id]::smallint[]
      AND c.confkey = ARRAY[foreign_beacon_id]::smallint[]
      AND c.confdeltype = 'n'
    ORDER BY c.conname
    LIMIT 1;

    IF exact_fk_name IS NULL THEN
        ALTER TABLE public.visitor_interaction
            ADD CONSTRAINT fk_visitor_interaction_beacon
            FOREIGN KEY (beacon_id)
            REFERENCES public.beacon (beacon_id)
            ON DELETE SET NULL;
    ELSIF NOT exact_fk_validated THEN
        EXECUTE format(
                'ALTER TABLE public.visitor_interaction VALIDATE CONSTRAINT %I',
                exact_fk_name);
    END IF;
END $$;
