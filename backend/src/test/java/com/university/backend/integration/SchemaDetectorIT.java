package com.university.backend.integration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies the read-only schema detector used before baseline adoption.
 *
 * <p>The detector must work when the beacon table does not exist (V1/V2) and
 * must never report a V4 database as safe when a required V4 invariant is
 * missing.</p>
 */
class SchemaDetectorIT {

    private static final String ADMIN_URL = requireEnv("SPRING_DATASOURCE_URL");
    private static final String USERNAME = requireEnv("SPRING_DATASOURCE_USERNAME");
    private static final String PASSWORD = requireEnv("SPRING_DATASOURCE_PASSWORD");
    private static final Path DETECTOR = locateDetector();

    @Test
    void emptyDatabaseIsIncomplete() throws Exception {
        try (Database database = Database.create("empty")) {
            Detection detection = detect(database);

            assertEquals("INCOMPLETE", detection.detectedVersion());
            assertFalse(detection.hasBeacon());
            assertFalse(detection.hasV4Shape());
        }
    }

    @Test
    void v1SchemaWithoutBeaconIsDetected() throws Exception {
        try (Database database = Database.create("v1")) {
            targeted(database.url(), "1").migrate();

            Detection detection = detect(database);

            assertEquals("1", detection.detectedVersion());
            assertEquals("1", detection.flywayVersion());
            assertFalse(detection.hasBeacon());
        }
    }

    @Test
    void v2SchemaWithoutBeaconIsDetected() throws Exception {
        try (Database database = Database.create("v2")) {
            targeted(database.url(), "2").migrate();

            Detection detection = detect(database);

            assertEquals("2", detection.detectedVersion());
            assertEquals("2", detection.flywayVersion());
            assertFalse(detection.hasBeacon());
        }
    }

    @Test
    void v3SchemaWithHistoryIsDetectedAsV3() throws Exception {
        try (Database database = Database.create("v3")) {
            targeted(database.url(), "3").migrate();

            Detection detection = detect(database);

            assertEquals("3", detection.detectedVersion());
            assertEquals("3", detection.flywayVersion());
            assertTrue(detection.hasBeacon());
            assertTrue(detection.hasV4Shape(),
                    "V3 already has the V4 catalog shape; history must disambiguate it");
        }
    }

    @Test
    void v4SchemaIsDetected() throws Exception {
        try (Database database = Database.create("v4")) {
            flyway(database.url()).migrate();

            Detection detection = detect(database);

            assertEquals("4", detection.detectedVersion());
            assertEquals("4", detection.flywayVersion());
            assertTrue(detection.hasBeacon());
            assertTrue(detection.hasV4Shape());
        }
    }

    @Test
    void hibernateSchemaWithoutHistoryIsDetectedAsV3() throws Exception {
        try (Database database = Database.create("hibernate")) {
            flyway(database.url()).migrate();
            try (Connection connection = database.connect()) {
                dropHistory(connection);
                stripV4Normalization(connection);
            }

            Detection detection = detect(database);

            assertEquals("3", detection.detectedVersion());
            assertNull(detection.flywayVersion());
            assertTrue(detection.hasBeacon());
            assertFalse(detection.hasV4Shape());
        }
    }

    @Test
    void v4MissingRequiredIndexIsNotAccepted() throws Exception {
        try (Database database = Database.create("missing_index")) {
            flyway(database.url()).migrate();
            execute(database, "drop index idx_visitor_interaction_interacted_at");

            Detection detection = detect(database);

            assertEquals("UNEXPECTED", detection.detectedVersion());
            assertEquals("4", detection.flywayVersion());
            assertFalse(detection.hasV4Shape());
        }
    }

    @Test
    void v4IndexOnWrongColumnIsNotAccepted() throws Exception {
        try (Database database = Database.create("wrong_index")) {
            flyway(database.url()).migrate();
            try (Connection connection = database.connect();
                 Statement statement = connection.createStatement()) {
                statement.execute("drop index idx_visitor_interaction_interacted_at");
                statement.execute("create index idx_visitor_interaction_interacted_at "
                        + "on visitor_interaction(artifact_id)");
            }

            Detection detection = detect(database);

            assertEquals("UNEXPECTED", detection.detectedVersion());
            assertEquals("4", detection.flywayVersion());
            assertFalse(detection.hasV4Shape());
        }
    }

    @Test
    void v4MissingMinorCheckIsNotAccepted() throws Exception {
        try (Database database = Database.create("missing_minor")) {
            flyway(database.url()).migrate();
            execute(database, "alter table beacon drop constraint ck_beacon_minor_range");

            Detection detection = detect(database);

            assertEquals("UNEXPECTED", detection.detectedVersion());
            assertEquals("4", detection.flywayVersion());
            assertFalse(detection.hasV4Shape());
        }
    }

    @Test
    void v4MissingEnabledDefaultIsNotAccepted() throws Exception {
        try (Database database = Database.create("missing_default")) {
            flyway(database.url()).migrate();
            execute(database, "alter table beacon alter column enabled drop default");

            Detection detection = detect(database);

            assertEquals("UNEXPECTED", detection.detectedVersion());
            assertEquals("4", detection.flywayVersion());
            assertFalse(detection.hasV4Shape());
        }
    }

    @Test
    void v4NullableEnabledIsNotAccepted() throws Exception {
        try (Database database = Database.create("nullable_enabled")) {
            flyway(database.url()).migrate();
            execute(database, "alter table beacon alter column enabled drop not null");

            Detection detection = detect(database);

            assertEquals("UNEXPECTED", detection.detectedVersion());
            assertEquals("4", detection.flywayVersion());
            assertFalse(detection.hasV4Shape());
        }
    }

    @Test
    void v4WrongForeignKeyActionIsNotAccepted() throws Exception {
        try (Database database = Database.create("wrong_fk")) {
            flyway(database.url()).migrate();
            try (Connection connection = database.connect()) {
                try (Statement statement = connection.createStatement()) {
                    statement.execute("alter table visitor_interaction "
                            + "drop constraint fk_visitor_interaction_beacon");
                    statement.execute("alter table visitor_interaction "
                            + "add constraint fk_visitor_interaction_beacon "
                            + "foreign key (beacon_id) references beacon(beacon_id)");
                }
            }

            Detection detection = detect(database);

            assertEquals("UNEXPECTED", detection.detectedVersion());
            assertEquals("4", detection.flywayVersion());
            assertFalse(detection.hasV4Shape());
        }
    }

    @Test
    void partialSchemaWithoutHistoryIsUnexpected() throws Exception {
        try (Database database = Database.create("partial")) {
            targeted(database.url(), "1").migrate();
            try (Connection connection = database.connect()) {
                dropHistory(connection);
                try (Statement statement = connection.createStatement()) {
                    statement.execute("alter table visitor_interaction "
                            + "add column visitor_id uuid");
                }
            }

            Detection detection = detect(database);

            assertEquals("UNEXPECTED", detection.detectedVersion());
            assertNull(detection.flywayVersion());
            assertFalse(detection.hasBeacon());
        }
    }

    private static Detection detect(Database database) throws Exception {
        String sql = Files.readString(DETECTOR);
        try (Connection connection = database.connect();
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(sql)) {
            assertTrue(result.next(), "detector returned no rows");
            return new Detection(
                    result.getString("detected_version"),
                    result.getString("flyway_version"),
                    result.getBoolean("has_beacon"),
                    result.getBoolean("has_v4_shape"));
        }
    }

    private static Flyway flyway(String url) {
        return configuration(url).load();
    }

    private static Flyway targeted(String url, String target) {
        return configuration(url).target(target).load();
    }

    private static org.flywaydb.core.api.configuration.FluentConfiguration configuration(
            String url) {
        return Flyway.configure()
                .dataSource(url, USERNAME, PASSWORD)
                .locations("classpath:db/migration")
                .baselineOnMigrate(false)
                .cleanDisabled(true);
    }

    private static void dropHistory(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("drop table if exists flyway_schema_history");
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

    private static void execute(Database database, String sql) throws SQLException {
        try (Connection connection = database.connect();
             Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private static Path locateDetector() {
        Path workingDirectory = Path.of(System.getProperty("user.dir"));
        for (Path directory = workingDirectory; directory != null; directory = directory.getParent()) {
            Path candidate = directory.resolve("scripts/database/detect-schema-version.sql");
            if (Files.isRegularFile(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Cannot locate detect-schema-version.sql");
    }

    private static String requireEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required environment variable: " + name);
        }
        return value;
    }

    private record Detection(
            String detectedVersion,
            String flywayVersion,
            boolean hasBeacon,
            boolean hasV4Shape) {
    }

    private record Database(String name, String url) implements AutoCloseable {

        static Database create(String suffix) throws SQLException {
            String name = "ltj54_detector_" + suffix + "_"
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
