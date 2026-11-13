package com.university.backend.integration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the authoritative PostgreSQL migration paths:
 *
 * <ul>
 *   <li>an empty database is created by V1..V4;</li>
 *   <li>a non-empty database is never baselined automatically;</li>
 *   <li>current (V3), V2 and legacy V1 schemas can be adopted explicitly
 *       without losing data.</li>
 * </ul>
 */
class DatabaseMigrationIT {

    private static final String ADMIN_URL = requireEnv("SPRING_DATASOURCE_URL");
    private static final String USERNAME = requireEnv("SPRING_DATASOURCE_USERNAME");
    private static final String PASSWORD = requireEnv("SPRING_DATASOURCE_PASSWORD");

    private static final UUID LEGACY_VISITOR =
            UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID CURRENT_VISITOR =
            UUID.fromString("22222222-2222-4222-8222-222222222222");
    private static final UUID V2_VISITOR =
            UUID.fromString("33333333-3333-4333-8333-333333333333");
    private static final UUID EVENT_ID =
            UUID.fromString("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    private static final Instant STARTED_AT = Instant.parse("2026-10-20T10:00:00Z");

    @Test
    void freshDatabaseRunsEveryMigrationAndValidates() throws Exception {
        try (Database database = Database.create("fresh")) {
            Flyway flyway = flyway(database.url());
            MigrateResult result = flyway.migrate();

            assertEquals(4, result.migrationsExecuted);
            flyway.validate();
            assertEquals("4", flyway.info().current().getVersion().getVersion());

            try (Connection connection = database.connect()) {
                assertTable(connection, "role");
                assertTable(connection, "user");
                assertTable(connection, "heritage_site");
                assertTable(connection, "artifact");
                assertTable(connection, "multimedia");
                assertTable(connection, "visitor_interaction");
                assertTable(connection, "beacon");

                assertColumn(connection, "visitor_interaction", "user_id", "integer", true);
                assertColumn(connection, "visitor_interaction", "visitor_id", "uuid", false);
                assertColumn(connection, "visitor_interaction", "beacon_id", "integer", true);
                assertColumn(connection, "beacon", "enabled", "boolean", false);
                assertUniqueConstraint(connection, "uk_visitor_interaction_event_id");
                assertUniqueConstraint(connection, "uk_beacon_identity");
                assertIndex(connection, "idx_visitor_interaction_interacted_at");
                assertIndex(connection, "idx_visitor_interaction_visitor_id");
                assertIndex(connection, "idx_visitor_interaction_beacon_id");
                assertIndex(connection, "idx_beacon_artifact_id");
                assertForeignKeyDeleteAction(
                        connection, "fk_visitor_interaction_beacon", "n");

                assertHistory(connection, "1", "SQL");
                assertHistory(connection, "2", "SQL");
                assertHistory(connection, "3", "SQL");
                assertHistory(connection, "4", "SQL");
            }

            assertEquals(0, flyway.migrate().migrationsExecuted);
        }
    }

    @Test
    void nonEmptySchemaWithoutHistoryIsNotBaselinedAutomatically() throws Exception {
        try (Database database = Database.create("no_history")) {
            targeted(database.url(), "1").migrate();
            try (Connection connection = database.connect()) {
                dropHistory(connection);
            }

            FlywayException exception = assertThrows(
                    FlywayException.class,
                    () -> flyway(database.url()).migrate());

            assertTrue(exception.getMessage().contains("non-empty schema"));
            try (Connection connection = database.connect()) {
                assertFalse(tableExists(connection, "flyway_schema_history"));
                assertFalse(columnExists(connection, "visitor_interaction", "visitor_id"));
            }
        }
    }

    @Test
    void currentSchemaIsBaselinedAtV3WithoutReapplyingMigrationsOrLosingData()
            throws Exception {
        try (Database database = Database.create("current")) {
            Flyway migrateAll = flyway(database.url());
            migrateAll.migrate();

            try (Connection connection = database.connect()) {
                dropHistory(connection);
                seedCurrentData(connection);
            }

            Flyway baseline = baselined(database.url(), "3");
            baseline.baseline();

            MigrateResult result = flyway(database.url()).migrate();
            assertEquals(1, result.migrationsExecuted);

            try (Connection connection = database.connect()) {
                assertCurrentData(connection);
                assertHistory(connection, "3", "BASELINE");
                assertHistory(connection, "4", "SQL");
                assertEquals(2, countHistoryRows(connection));
                assertColumn(connection, "visitor_interaction", "visitor_id", "uuid", false);
                assertColumn(connection, "visitor_interaction", "beacon_id", "integer", true);
                assertForeignKeyDeleteAction(
                        connection, "fk_visitor_interaction_beacon", "n");

                try (Statement statement = connection.createStatement()) {
                    statement.executeUpdate("delete from beacon where beacon_id = 1");
                }
                assertNull(queryObject(connection,
                        "select beacon_id from visitor_interaction where event_id = ?::uuid",
                        EVENT_ID.toString()));
            }

            assertEquals(0, flyway(database.url()).migrate().migrationsExecuted);
        }
    }

    @Test
    void v2SchemaIsBaselinedAtV2AndOnlyV3AndV4AreApplied() throws Exception {
        try (Database database = Database.create("v2")) {
            targeted(database.url(), "2").migrate();
            try (Connection connection = database.connect()) {
                dropHistory(connection);
                seedV2Data(connection);
            }

            Flyway baseline = baselined(database.url(), "2");
            baseline.baseline();

            assertEquals(2, flyway(database.url()).migrate().migrationsExecuted);

            try (Connection connection = database.connect()) {
                assertV2Data(connection);
                assertTable(connection, "beacon");
                assertColumn(connection, "visitor_interaction", "beacon_id", "integer", true);
                assertIndex(connection, "idx_beacon_artifact_id");
                assertIndex(connection, "idx_visitor_interaction_beacon_id");
                assertHistory(connection, "2", "BASELINE");
                assertHistory(connection, "3", "SQL");
                assertHistory(connection, "4", "SQL");
                assertEquals(3, countHistoryRows(connection));
            }
        }
    }

    @Test
    void legacyV1SchemaIsBaselinedAtV1AndUpgradedWithoutLosingData() throws Exception {
        try (Database database = Database.create("legacy")) {
            targeted(database.url(), "1").migrate();
            try (Connection connection = database.connect()) {
                dropHistory(connection);
                seedLegacyData(connection);
            }

            Flyway baseline = baselined(database.url(), "1");
            baseline.baseline();

            assertEquals(3, flyway(database.url()).migrate().migrationsExecuted);

            try (Connection connection = database.connect()) {
                assertLegacyDataPreserved(connection);
                assertTable(connection, "beacon");
                assertColumn(connection, "visitor_interaction", "user_id", "integer", true);
                assertColumn(connection, "visitor_interaction", "visitor_id", "uuid", false);
                assertColumn(connection, "visitor_interaction", "beacon_id", "integer", true);
                assertIndex(connection, "idx_visitor_interaction_interacted_at");
                assertIndex(connection, "idx_visitor_interaction_visitor_id");

                UUID expectedVisitor = UUID.fromString(
                        "00000000-0000-4000-8000-000000000001");
                assertEquals(expectedVisitor, queryObject(connection,
                        "select visitor_id from visitor_interaction where event_id = ?::uuid",
                        EVENT_ID.toString()));

                assertHistory(connection, "1", "BASELINE");
                assertHistory(connection, "2", "SQL");
                assertHistory(connection, "3", "SQL");
                assertHistory(connection, "4", "SQL");
                assertEquals(4, countHistoryRows(connection));
            }
        }
    }

    @Test
    void legacyHibernateSchemaIsNormalizedByV4() throws Exception {
        try (Database database = Database.create("hibernate")) {
            flyway(database.url()).migrate();

            try (Connection connection = database.connect()) {
                dropHistory(connection);
                stripV4Normalization(connection);
                seedCurrentData(connection);
            }

            Flyway baseline = baselined(database.url(), "3");
            baseline.baseline();

            assertEquals(1, flyway(database.url()).migrate().migrationsExecuted);

            try (Connection connection = database.connect()) {
                assertCurrentData(connection);
                assertIndex(connection, "idx_visitor_interaction_interacted_at");
                assertIndex(connection, "idx_visitor_interaction_visitor_id");
                assertIndex(connection, "idx_visitor_interaction_beacon_id");
                assertIndex(connection, "idx_beacon_artifact_id");
                assertCheckConstraint(connection, "ck_beacon_major_range");
                assertCheckConstraint(connection, "ck_beacon_minor_range");
                assertEquals("true", queryObject(connection, """
                        select column_default
                        from information_schema.columns
                        where table_schema = 'public'
                          and table_name = 'beacon'
                          and column_name = 'enabled'
                        """).toString());
                assertForeignKeyDeleteAction(
                        connection, "fk_visitor_interaction_beacon", "n");

                try (Statement statement = connection.createStatement()) {
                    statement.executeUpdate("delete from beacon where beacon_id = 1");
                }
                assertNull(queryObject(connection,
                        "select beacon_id from visitor_interaction where event_id = ?::uuid",
                        EVENT_ID.toString()));

                assertHistory(connection, "3", "BASELINE");
                assertHistory(connection, "4", "SQL");
                assertEquals(2, countHistoryRows(connection));
            }
        }
    }

    @Test
    void wrongMajorConstraintWithExpectedNameIsRejectedWithoutReplacement() throws Exception {
        try (Database database = Database.create("wrong_major_check")) {
            targeted(database.url(), "3").migrate();
            executeSql(database,
                    "alter table beacon drop constraint ck_beacon_major_range");
            executeSql(database,
                    "alter table beacon add constraint ck_beacon_major_range "
                            + "check (major between 0 and 100)");

            FlywayException exception = assertThrows(
                    FlywayException.class,
                    () -> flyway(database.url()).migrate());

            assertTrue(exception.getMessage().contains("ck_beacon_major_range"));
            assertTrue(exception.getMessage().contains(
                    "does not enforce major BETWEEN 0 AND 65535"));
            try (Connection connection = database.connect()) {
                String definition = Objects.requireNonNull(queryObject(connection,
                        "select pg_get_constraintdef(oid) from pg_constraint "
                                + "where conname = 'ck_beacon_major_range' "
                                + "and conrelid = 'public.beacon'::regclass")).toString();
                assertTrue(definition.contains("<= 100"));
                assertEquals(0, queryInt(connection,
                        "select count(*) from flyway_schema_history where version = '4'"));
            }
        }
    }

    @Test
    void wrongMinorConstraintWithExpectedNameIsRejectedWithoutReplacement() throws Exception {
        try (Database database = Database.create("wrong_minor_check")) {
            targeted(database.url(), "3").migrate();
            executeSql(database,
                    "alter table beacon drop constraint ck_beacon_minor_range");
            executeSql(database,
                    "alter table beacon add constraint ck_beacon_minor_range "
                            + "check (minor between 0 and 100)");

            FlywayException exception = assertThrows(
                    FlywayException.class,
                    () -> flyway(database.url()).migrate());

            assertTrue(exception.getMessage().contains("ck_beacon_minor_range"));
            assertTrue(exception.getMessage().contains(
                    "does not enforce minor BETWEEN 0 AND 65535"));
            try (Connection connection = database.connect()) {
                String definition = Objects.requireNonNull(queryObject(connection,
                        "select pg_get_constraintdef(oid) from pg_constraint "
                                + "where conname = 'ck_beacon_minor_range' "
                                + "and conrelid = 'public.beacon'::regclass")).toString();
                assertTrue(definition.contains("<= 100"));
                assertEquals(0, queryInt(connection,
                        "select count(*) from flyway_schema_history where version = '4'"));
            }
        }
    }

    private static Flyway flyway(String url) {
        return configuration(url).load();
    }

    private static Flyway targeted(String url, String target) {
        return configuration(url).target(target).load();
    }

    private static Flyway baselined(String url, String version) {
        return configuration(url).baselineVersion(version).load();
    }

    private static org.flywaydb.core.api.configuration.FluentConfiguration configuration(
            String url) {
        return Flyway.configure()
                .dataSource(url, USERNAME, PASSWORD)
                .locations("classpath:db/migration")
                .baselineOnMigrate(false)
                .cleanDisabled(true);
    }

    private static void seedLegacyData(Connection connection) throws SQLException {
        int roleId = insertRole(connection);
        int userId = insertUser(connection, roleId, "legacy_user");
        int siteId = insertSite(connection, "Legacy site");
        int artifactId = insertArtifact(connection, siteId, "Legacy artifact");
        insertMultimedia(connection, artifactId);
        insertLegacyInteraction(connection, userId, artifactId);
    }

    private static void seedV2Data(Connection connection) throws SQLException {
        int roleId = insertRole(connection);
        int userId = insertUser(connection, roleId, "v2_user");
        int siteId = insertSite(connection, "V2 site");
        int artifactId = insertArtifact(connection, siteId, "V2 artifact");
        insertMultimedia(connection, artifactId);
        insertV2Interaction(connection, V2_VISITOR, userId, artifactId);
    }

    private static void seedCurrentData(Connection connection) throws SQLException {
        int roleId = insertRole(connection);
        int userId = insertUser(connection, roleId, "current_user");
        int siteId = insertSite(connection, "Current site");
        int artifactId = insertArtifact(connection, siteId, "Current artifact");
        insertMultimedia(connection, artifactId);
        int beaconId = insertBeacon(connection, artifactId);
        insertInteraction(connection, CURRENT_VISITOR, userId, artifactId, beaconId);
    }

    private static void assertCurrentData(Connection connection) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                select visitor_id, user_id, artifact_id, beacon_id, duration_seconds
                from visitor_interaction
                where event_id = ?::uuid
                """)) {
            statement.setString(1, EVENT_ID.toString());
            try (ResultSet result = statement.executeQuery()) {
                assertTrue(result.next());
                assertEquals(CURRENT_VISITOR, result.getObject("visitor_id", UUID.class));
                assertEquals(1, result.getInt("user_id"));
                assertEquals(1, result.getInt("artifact_id"));
                assertEquals(1, result.getInt("beacon_id"));
                assertEquals(30L, result.getLong("duration_seconds"));
            }
        }
        assertEquals(1, queryInt(connection, "select count(*) from multimedia"));
        assertEquals(1, queryInt(connection, "select count(*) from beacon"));
        assertEquals(1, queryInt(connection, "select count(*) from visitor_interaction"));
    }

    private static void assertV2Data(Connection connection) throws SQLException {
        assertEquals(V2_VISITOR, queryObject(connection,
                "select visitor_id from visitor_interaction where event_id = ?::uuid",
                EVENT_ID.toString()));
        assertEquals(1, queryInt(connection, "select count(*) from visitor_interaction"));
        assertEquals(1, queryInt(connection, "select count(*) from multimedia"));
    }

    private static void assertLegacyDataPreserved(Connection connection) throws SQLException {
        assertEquals(1, queryInt(connection, "select count(*) from heritage_site"));
        assertEquals(1, queryInt(connection, "select count(*) from artifact"));
        assertEquals(1, queryInt(connection, "select count(*) from multimedia"));
        assertEquals(1, queryInt(connection, "select count(*) from visitor_interaction"));
        assertEquals(1, queryInt(connection,
                "select count(*) from visitor_interaction where user_id = 1"));
        assertEquals(30L, queryLong(connection,
                "select duration_seconds from visitor_interaction where event_id = ?::uuid",
                EVENT_ID.toString()));
    }

    private static int insertRole(Connection connection) throws SQLException {
        return insertReturningId(connection,
                "insert into role(name) values ('VISITOR') returning role_id");
    }

    private static int insertUser(Connection connection, int roleId, String username)
            throws SQLException {
        return insertReturningId(connection, """
                insert into "user" (role_id, username, email, password_hash)
                values (?, ?, ?, 'not-used-in-this-test')
                returning user_id
                """, roleId, username, username + "@example.com");
    }

    private static int insertSite(Connection connection, String name) throws SQLException {
        return insertReturningId(connection,
                "insert into heritage_site(name) values (?) returning site_id", name);
    }

    private static int insertArtifact(Connection connection, int siteId, String name)
            throws SQLException {
        return insertReturningId(connection,
                "insert into artifact(site_id, name) values (?, ?) returning artifact_id",
                siteId, name);
    }

    private static void insertMultimedia(Connection connection, int artifactId)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                insert into multimedia (artifact_id, type, title, url)
                values (?, 'IMAGE', 'Fixture image', 'https://example.com/image.jpg')
                """)) {
            statement.setInt(1, artifactId);
            statement.executeUpdate();
        }
    }

    private static int insertBeacon(Connection connection, int artifactId)
            throws SQLException {
        return insertReturningId(connection, """
                insert into beacon (name, proximity_uuid, major, minor, enabled, artifact_id)
                values ('Fixture beacon', ?::uuid, 1, 1, true, ?)
                returning beacon_id
                """, UUID.fromString("44444444-4444-4444-8444-444444444444").toString(),
                artifactId);
    }

    private static void insertLegacyInteraction(
            Connection connection, int userId, int artifactId) throws SQLException {
        insertInteractionRow(
                connection,
                "insert into visitor_interaction "
                        + "(event_id, user_id, artifact_id, interaction_type, language_code, "
                        + "started_at, ended_at, duration_seconds, interacted_at) "
                        + "values (?::uuid, ?, ?, 'VIEW', 'vi', ?, ?, 30, ?)",
                EVENT_ID, userId, artifactId, STARTED_AT, STARTED_AT.plusSeconds(30),
                STARTED_AT);
    }

    private static void insertV2Interaction(
            Connection connection,
            UUID visitorId,
            int userId,
            int artifactId) throws SQLException {
        insertInteractionRow(
                connection,
                "insert into visitor_interaction "
                        + "(event_id, visitor_id, user_id, artifact_id, "
                        + "interaction_type, language_code, started_at, ended_at, "
                        + "duration_seconds, interacted_at) "
                        + "values (?::uuid, ?::uuid, ?, ?, 'VIEW', 'vi', ?, ?, 30, ?)",
                EVENT_ID, visitorId.toString(), userId, artifactId,
                STARTED_AT, STARTED_AT.plusSeconds(30), STARTED_AT);
    }

    private static void insertInteraction(
            Connection connection,
            UUID visitorId,
            int userId,
            int artifactId,
            Integer beaconId) throws SQLException {
        insertInteractionRow(
                connection,
                "insert into visitor_interaction "
                        + "(event_id, visitor_id, user_id, artifact_id, beacon_id, "
                        + "interaction_type, language_code, started_at, ended_at, "
                        + "duration_seconds, interacted_at) "
                        + "values (?::uuid, ?::uuid, ?, ?, ?, 'VIEW', 'vi', ?, ?, 30, ?)",
                EVENT_ID, visitorId.toString(), userId, artifactId, beaconId,
                STARTED_AT, STARTED_AT.plusSeconds(30), STARTED_AT);
    }

    private static void insertInteractionRow(
            Connection connection, String sql, Object... arguments) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < arguments.length; i++) {
                Object value = arguments[i];
                if (value instanceof Instant instant) {
                    statement.setTimestamp(i + 1, Timestamp.from(instant));
                } else {
                    statement.setObject(i + 1, value);
                }
            }
            statement.executeUpdate();
        }
    }

    private static int insertReturningId(
            Connection connection, String sql, Object... arguments) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < arguments.length; i++) {
                statement.setObject(i + 1, arguments[i]);
            }
            try (ResultSet result = statement.executeQuery()) {
                assertTrue(result.next());
                return result.getInt(1);
            }
        }
    }

    private static void stripV4Normalization(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("drop index if exists idx_visitor_interaction_interacted_at");
            statement.execute("drop index if exists idx_visitor_interaction_visitor_id");
            statement.execute("drop index if exists idx_visitor_interaction_beacon_id");
            statement.execute("drop index if exists idx_beacon_artifact_id");
            statement.execute("alter table beacon alter column enabled drop default");
            statement.execute("alter table beacon drop constraint if exists ck_beacon_major_range");
            statement.execute("alter table beacon drop constraint if exists ck_beacon_minor_range");
            statement.execute("alter table visitor_interaction "
                    + "drop constraint if exists fk_visitor_interaction_beacon");
            statement.execute("alter table visitor_interaction "
                    + "add constraint fk_visitor_interaction_beacon "
                    + "foreign key (beacon_id) references beacon(beacon_id)");
        }
    }

    private static void executeSql(Database database, String sql) throws SQLException {
        try (Connection connection = database.connect();
             Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private static void dropHistory(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("drop table if exists flyway_schema_history");
        }
    }

    private static boolean tableExists(Connection connection, String table) throws SQLException {
        return queryInt(connection,
                "select count(*) from information_schema.tables "
                        + "where table_schema = 'public' and table_name = ?",
                table) == 1;
    }

    private static boolean columnExists(
            Connection connection, String table, String column) throws SQLException {
        return queryInt(connection,
                "select count(*) from information_schema.columns "
                        + "where table_schema = 'public' and table_name = ? and column_name = ?",
                table, column) == 1;
    }

    private static void assertTable(Connection connection, String table) throws SQLException {
        assertTrue(tableExists(connection, table), "missing table: " + table);
    }

    private static void assertColumn(
            Connection connection,
            String table,
            String column,
            String type,
            boolean nullable) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                select data_type, is_nullable
                from information_schema.columns
                where table_schema = 'public' and table_name = ? and column_name = ?
                """)) {
            statement.setString(1, table);
            statement.setString(2, column);
            try (ResultSet result = statement.executeQuery()) {
                assertTrue(result.next(), "missing column: " + table + "." + column);
                assertEquals(type, result.getString("data_type"));
                assertEquals(nullable ? "YES" : "NO", result.getString("is_nullable"));
            }
        }
    }

    private static void assertUniqueConstraint(Connection connection, String name)
            throws SQLException {
        assertTrue(queryInt(connection,
                "select count(*) from pg_constraint "
                        + "where conname = ? and contype = 'u'", name) == 1,
                "missing unique constraint: " + name);
    }

    private static void assertCheckConstraint(Connection connection, String name)
            throws SQLException {
        assertTrue(queryInt(connection,
                "select count(*) from pg_constraint "
                        + "where conname = ? and contype = 'c'", name) == 1,
                "missing check constraint: " + name);
    }

    private static void assertIndex(Connection connection, String name) throws SQLException {
        assertTrue(queryInt(connection,
                "select count(*) from pg_indexes "
                        + "where schemaname = 'public' and indexname = ?", name) == 1,
                "missing index: " + name);
    }

    private static void assertForeignKeyDeleteAction(
            Connection connection, String name, String expected) throws SQLException {
        assertEquals(expected, queryObject(connection,
                "select confdeltype::text from pg_constraint "
                        + "where conname = ? and contype = 'f'",
                name));
    }

    private static void assertHistory(Connection connection, String version, String type)
            throws SQLException {
        assertEquals(1, queryInt(connection,
                "select count(*) from flyway_schema_history "
                        + "where version = ? and type = ? and success = true",
                version, type), "missing Flyway history: " + version + "/" + type);
    }

    private static int countHistoryRows(Connection connection) throws SQLException {
        return queryInt(connection, "select count(*) from flyway_schema_history");
    }

    private static int queryInt(Connection connection, String sql, Object... arguments)
            throws SQLException {
        Object value = queryObject(connection, sql, arguments);
        return ((Number) Objects.requireNonNull(value)).intValue();
    }

    private static long queryLong(Connection connection, String sql, Object... arguments)
            throws SQLException {
        Object value = queryObject(connection, sql, arguments);
        return ((Number) Objects.requireNonNull(value)).longValue();
    }

    private static Object queryObject(Connection connection, String sql, Object... arguments)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < arguments.length; i++) {
                statement.setObject(i + 1, arguments[i]);
            }
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getObject(1) : null;
            }
        }
    }

    private static String requireEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required environment variable: " + name);
        }
        return value;
    }

    private record Database(String name, String url) implements AutoCloseable {

        static Database create(String suffix) throws SQLException {
            String name = "ltj54_" + suffix + "_"
                    + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            try (Connection connection = DriverManager.getConnection(
                    ADMIN_URL, USERNAME, PASSWORD);
                 Statement statement = connection.createStatement()) {
                statement.execute("create database " + quoteIdentifier(name));
            }
            return new Database(name, databaseUrl(name));
        }

        Connection connect() throws SQLException {
            return DriverManager.getConnection(url, USERNAME, PASSWORD);
        }

        @Override
        public void close() throws SQLException {
            try (Connection connection = DriverManager.getConnection(
                    ADMIN_URL, USERNAME, PASSWORD);
                 Statement statement = connection.createStatement()) {
                statement.execute("drop database if exists "
                        + quoteIdentifier(name) + " with (force)");
            }
        }

        private static String databaseUrl(String name) {
            int queryIndex = ADMIN_URL.indexOf('?');
            String base = queryIndex >= 0 ? ADMIN_URL.substring(0, queryIndex) : ADMIN_URL;
            String query = queryIndex >= 0 ? ADMIN_URL.substring(queryIndex) : "";
            int slash = base.lastIndexOf('/');
            if (slash < 0) {
                throw new IllegalStateException("Cannot derive database URL from " + ADMIN_URL);
            }
            return base.substring(0, slash + 1) + name + query;
        }

        private static String quoteIdentifier(String identifier) {
            return '"' + identifier.replace("\"", "\"\"") + '"';
        }
    }
}
