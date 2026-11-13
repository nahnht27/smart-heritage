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
    existing_fk text;
    existing_delete_action "char";
BEGIN
    SELECT constraint_name, delete_action
    INTO existing_fk, existing_delete_action
    FROM (
        SELECT conname AS constraint_name,
               confdeltype AS delete_action
        FROM pg_constraint
        WHERE conrelid = 'public.visitor_interaction'::regclass
          AND contype = 'f'
          AND confrelid = 'public.beacon'::regclass
        LIMIT 1
    ) existing;

    IF existing_fk IS NULL THEN
        ALTER TABLE public.visitor_interaction
            ADD CONSTRAINT fk_visitor_interaction_beacon
            FOREIGN KEY (beacon_id)
            REFERENCES public.beacon (beacon_id)
            ON DELETE SET NULL;
    ELSIF existing_delete_action <> 'n' THEN
        EXECUTE format(
                'ALTER TABLE public.visitor_interaction DROP CONSTRAINT %I',
                existing_fk);
        ALTER TABLE public.visitor_interaction
            ADD CONSTRAINT fk_visitor_interaction_beacon
            FOREIGN KEY (beacon_id)
            REFERENCES public.beacon (beacon_id)
            ON DELETE SET NULL;
    END IF;
END $$;
