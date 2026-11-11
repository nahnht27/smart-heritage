-- Detect which migration level an existing Smart Heritage database matches.
--
-- Usage (from the repository root):
--   psql "$SPRING_DATASOURCE_URL" -f scripts/database/detect-schema-version.sql
--
-- This is a read-only diagnostic. It does not modify the database.
-- Review the output and the schema-verification checklist in
-- docs/database/schema-baseline.md before running flyway:baseline.

WITH state AS (
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
              AND column_name = 'user_id'
              AND is_nullable = 'YES'
        ) AS user_id_nullable,
        EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname = 'idx_visitor_interaction_interacted_at'
        ) AS has_analytics_index,
        EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname = 'idx_visitor_interaction_visitor_id'
        ) AS has_visitor_index,
        EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'public.beacon'::regclass
              AND conname = 'ck_beacon_major_range'
        ) AS has_beacon_checks,
        EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'public.visitor_interaction'::regclass
              AND contype = 'f'
              AND confrelid = 'public.beacon'::regclass
              AND confdeltype = 'n'
        ) AS has_beacon_set_null
    FROM (SELECT 1) singleton
)
SELECT
    CASE
        WHEN NOT has_base_tables THEN 'INCOMPLETE'
        WHEN has_beacon
             AND has_visitor_id
             AND user_id_nullable
             AND has_analytics_index
             AND has_visitor_index
             AND has_beacon_checks
             AND has_beacon_set_null
            THEN '4'
        WHEN has_beacon
             AND has_visitor_id
             AND user_id_nullable
            THEN '3'
        WHEN has_visitor_id
             AND user_id_nullable
             AND NOT has_beacon
            THEN '2'
        WHEN NOT has_visitor_id
             AND NOT has_beacon
            THEN '1'
        ELSE 'UNEXPECTED'
    END AS detected_version,
    has_base_tables,
    has_beacon,
    has_visitor_id,
    user_id_nullable,
    has_analytics_index,
    has_visitor_index,
    has_beacon_checks,
    has_beacon_set_null
FROM state;
