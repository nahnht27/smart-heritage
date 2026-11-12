-- Detect which migration level an existing Smart Heritage database matches.
--
-- Usage (from the repository root):
--   psql "$SPRING_DATASOURCE_URL" -f scripts/database/detect-schema-version.sql
--
-- This is a read-only diagnostic. It does not modify the database.
--
-- The detector inspects catalog shape, not trust. Flyway history is used only
-- to disambiguate V3 from V4 when it exists: the V3 migration already creates
-- the same index/check/default/FK catalog entries as V4, so shape alone cannot
-- distinguish those two histories. With no history, a fully normalized schema
-- is reported as V4, which is safe for baseline adoption.
--
-- Review the output and the schema-verification checklist in
-- docs/database/schema-baseline.md before running flyway:baseline.

WITH history AS (
    SELECT
        to_regclass('public.flyway_schema_history') IS NOT NULL AS has_history,
        CASE
            WHEN to_regclass('public.flyway_schema_history') IS NULL THEN NULL
            ELSE NULLIF(
                (xpath(
                    '/row/max/text()',
                    query_to_xml(
                        'select max(version) as max '
                        'from public.flyway_schema_history where success',
                        false,
                        true,
                        ''
                    )
                ))[1]::text,
                ''
            )
        END AS flyway_version
),
state AS (
    SELECT
        to_regclass('public.role') IS NOT NULL
            AND to_regclass('public.heritage_site') IS NOT NULL
            AND to_regclass('public.artifact') IS NOT NULL
            AND to_regclass('public.multimedia') IS NOT NULL
            AND to_regclass('public.visitor_interaction') IS NOT NULL
            AND to_regclass('public."user"') IS NOT NULL AS has_base_tables,
        to_regclass('public.beacon') IS NOT NULL AS has_beacon,
        EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'visitor_interaction'
              AND column_name = 'visitor_id'
        ) AS has_visitor_id,
        EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'visitor_interaction'
              AND column_name = 'visitor_id'
              AND is_nullable = 'NO'
        ) AS visitor_id_not_null,
        EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'visitor_interaction'
              AND column_name = 'user_id'
              AND is_nullable = 'YES'
        ) AS user_id_nullable,
        EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'visitor_interaction'
              AND column_name = 'beacon_id'
        ) AS has_beacon_id,
        EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'visitor_interaction'
              AND column_name = 'beacon_id'
              AND is_nullable = 'YES'
        ) AS beacon_id_nullable,
        EXISTS (
            SELECT 1
            FROM pg_index i
            JOIN pg_class idx ON idx.oid = i.indexrelid
            JOIN pg_class tbl ON tbl.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = tbl.relnamespace
            WHERE n.nspname = 'public'
              AND tbl.relname = 'visitor_interaction'
              AND idx.relname = 'idx_visitor_interaction_interacted_at'
              AND i.indisvalid
              AND i.indisready
              AND i.indpred IS NULL
              AND i.indexprs IS NULL
              AND i.indnkeyatts = 1
              AND i.indkey[0] = (
                  SELECT a.attnum
                  FROM pg_attribute a
                  WHERE a.attrelid = tbl.oid
                    AND a.attname = 'interacted_at'
                    AND NOT a.attisdropped
              )
        ) AS has_analytics_index,
        EXISTS (
            SELECT 1
            FROM pg_index i
            JOIN pg_class idx ON idx.oid = i.indexrelid
            JOIN pg_class tbl ON tbl.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = tbl.relnamespace
            WHERE n.nspname = 'public'
              AND tbl.relname = 'visitor_interaction'
              AND idx.relname = 'idx_visitor_interaction_visitor_id'
              AND i.indisvalid
              AND i.indisready
              AND i.indpred IS NULL
              AND i.indexprs IS NULL
              AND i.indnkeyatts = 1
              AND i.indkey[0] = (
                  SELECT a.attnum
                  FROM pg_attribute a
                  WHERE a.attrelid = tbl.oid
                    AND a.attname = 'visitor_id'
                    AND NOT a.attisdropped
              )
        ) AS has_visitor_index,
        EXISTS (
            SELECT 1
            FROM pg_index i
            JOIN pg_class idx ON idx.oid = i.indexrelid
            JOIN pg_class tbl ON tbl.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = tbl.relnamespace
            WHERE n.nspname = 'public'
              AND tbl.relname = 'visitor_interaction'
              AND idx.relname = 'idx_visitor_interaction_beacon_id'
              AND i.indisvalid
              AND i.indisready
              AND i.indpred IS NULL
              AND i.indexprs IS NULL
              AND i.indnkeyatts = 1
              AND i.indkey[0] = (
                  SELECT a.attnum
                  FROM pg_attribute a
                  WHERE a.attrelid = tbl.oid
                    AND a.attname = 'beacon_id'
                    AND NOT a.attisdropped
              )
        ) AS has_beacon_index,
        EXISTS (
            SELECT 1
            FROM pg_index i
            JOIN pg_class idx ON idx.oid = i.indexrelid
            JOIN pg_class tbl ON tbl.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = tbl.relnamespace
            WHERE n.nspname = 'public'
              AND tbl.relname = 'beacon'
              AND idx.relname = 'idx_beacon_artifact_id'
              AND i.indisvalid
              AND i.indisready
              AND i.indpred IS NULL
              AND i.indexprs IS NULL
              AND i.indnkeyatts = 1
              AND i.indkey[0] = (
                  SELECT a.attnum
                  FROM pg_attribute a
                  WHERE a.attrelid = tbl.oid
                    AND a.attname = 'artifact_id'
                    AND NOT a.attisdropped
              )
        ) AS has_beacon_artifact_index,
        EXISTS (
            SELECT 1
            FROM pg_constraint c
            WHERE c.conrelid = to_regclass('public.beacon')
              AND c.contype = 'c'
              AND c.conname = 'ck_beacon_major_range'
              AND c.convalidated
        ) AS has_beacon_major_check,
        EXISTS (
            SELECT 1
            FROM pg_constraint c
            WHERE c.conrelid = to_regclass('public.beacon')
              AND c.contype = 'c'
              AND c.conname = 'ck_beacon_minor_range'
              AND c.convalidated
        ) AS has_beacon_minor_check,
        EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'beacon'
              AND column_name = 'enabled'
              AND is_nullable = 'NO'
        ) AS has_beacon_enabled_not_null,
        EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'beacon'
              AND column_name = 'enabled'
              AND lower(btrim(column_default))
                  IN ('true', 'true::boolean', '(true)')
        ) AS has_beacon_enabled_true_default,
        EXISTS (
            SELECT 1
            FROM pg_index i
            JOIN pg_class idx ON idx.oid = i.indexrelid
            JOIN pg_class tbl ON tbl.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = tbl.relnamespace
            WHERE n.nspname = 'public'
              AND tbl.relname = 'beacon'
              AND i.indisunique
              AND i.indisvalid
              AND i.indisready
              AND i.indpred IS NULL
              AND i.indexprs IS NULL
              AND i.indnkeyatts = 3
              AND i.indkey[0] = (
                  SELECT a.attnum
                  FROM pg_attribute a
                  WHERE a.attrelid = tbl.oid
                    AND a.attname = 'proximity_uuid'
                    AND NOT a.attisdropped
              )
              AND i.indkey[1] = (
                  SELECT a.attnum
                  FROM pg_attribute a
                  WHERE a.attrelid = tbl.oid
                    AND a.attname = 'major'
                    AND NOT a.attisdropped
              )
              AND i.indkey[2] = (
                  SELECT a.attnum
                  FROM pg_attribute a
                  WHERE a.attrelid = tbl.oid
                    AND a.attname = 'minor'
                    AND NOT a.attisdropped
              )
        ) AS has_beacon_identity_unique,
        EXISTS (
            SELECT 1
            FROM pg_index i
            JOIN pg_class idx ON idx.oid = i.indexrelid
            JOIN pg_class tbl ON tbl.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = tbl.relnamespace
            WHERE n.nspname = 'public'
              AND tbl.relname = 'visitor_interaction'
              AND i.indisunique
              AND i.indisvalid
              AND i.indisready
              AND i.indpred IS NULL
              AND i.indexprs IS NULL
              AND i.indnkeyatts = 1
              AND i.indkey[0] = (
                  SELECT a.attnum
                  FROM pg_attribute a
                  WHERE a.attrelid = tbl.oid
                    AND a.attname = 'event_id'
                    AND NOT a.attisdropped
              )
        ) AS has_event_id_unique,
        EXISTS (
            SELECT 1
            FROM pg_constraint c
            WHERE c.contype = 'f'
              AND c.conrelid = to_regclass('public.visitor_interaction')
              AND c.confrelid = to_regclass('public.beacon')
              AND c.confdeltype = 'n'
              AND c.convalidated
              AND c.conkey = ARRAY[
                  (
                      SELECT a.attnum
                      FROM pg_attribute a
                      WHERE a.attrelid = to_regclass('public.visitor_interaction')
                        AND a.attname = 'beacon_id'
                        AND NOT a.attisdropped
                  )
              ]::smallint[]
              AND c.confkey = ARRAY[
                  (
                      SELECT a.attnum
                      FROM pg_attribute a
                      WHERE a.attrelid = to_regclass('public.beacon')
                        AND a.attname = 'beacon_id'
                        AND NOT a.attisdropped
                  )
              ]::smallint[]
        ) AS has_beacon_fk_set_null
    FROM (SELECT 1) singleton
),
shapes AS (
    SELECT
        state.*,
        state.has_base_tables
            AND NOT state.has_visitor_id
            AND NOT state.has_beacon_id
            AND NOT state.has_beacon
            AND state.has_event_id_unique AS has_v1_shape,
        state.has_base_tables
            AND state.has_visitor_id
            AND state.visitor_id_not_null
            AND state.user_id_nullable
            AND NOT state.has_beacon_id
            AND NOT state.has_beacon
            AND state.has_event_id_unique AS has_v2_shape,
        state.has_base_tables
            AND state.has_beacon
            AND state.has_visitor_id
            AND state.visitor_id_not_null
            AND state.user_id_nullable
            AND state.has_beacon_id
            AND state.beacon_id_nullable
            AND state.has_beacon_identity_unique
            AND state.has_event_id_unique AS has_v3_shape
    FROM state
),
requirements AS (
    SELECT
        shapes.*,
        shapes.has_v3_shape
            AND shapes.has_analytics_index
            AND shapes.has_visitor_index
            AND shapes.has_beacon_index
            AND shapes.has_beacon_artifact_index
            AND shapes.has_beacon_major_check
            AND shapes.has_beacon_minor_check
            AND shapes.has_beacon_enabled_not_null
            AND shapes.has_beacon_enabled_true_default
            AND shapes.has_beacon_fk_set_null AS has_v4_shape
    FROM shapes
)
SELECT
    CASE
        WHEN NOT has_base_tables THEN 'INCOMPLETE'
        WHEN history.has_history THEN
            CASE
                WHEN history.flyway_version = '1' AND has_v1_shape THEN '1'
                WHEN history.flyway_version = '2' AND has_v2_shape THEN '2'
                WHEN history.flyway_version = '3' AND has_v3_shape THEN '3'
                WHEN history.flyway_version = '4' AND has_v4_shape THEN '4'
                ELSE 'UNEXPECTED'
            END
        WHEN has_v4_shape THEN '4'
        WHEN has_v3_shape THEN '3'
        WHEN has_v2_shape THEN '2'
        WHEN has_v1_shape THEN '1'
        ELSE 'UNEXPECTED'
    END AS detected_version,
    history.flyway_version,
    history.has_history,
    requirements.has_base_tables,
    requirements.has_beacon,
    requirements.has_visitor_id,
    requirements.visitor_id_not_null,
    requirements.user_id_nullable,
    requirements.has_beacon_id,
    requirements.beacon_id_nullable,
    requirements.has_analytics_index,
    requirements.has_visitor_index,
    requirements.has_beacon_index,
    requirements.has_beacon_artifact_index,
    requirements.has_beacon_major_check,
    requirements.has_beacon_minor_check,
    requirements.has_beacon_enabled_not_null,
    requirements.has_beacon_enabled_true_default,
    requirements.has_beacon_identity_unique,
    requirements.has_event_id_unique,
    requirements.has_beacon_fk_set_null,
    requirements.has_v4_shape
FROM requirements
CROSS JOIN history;
