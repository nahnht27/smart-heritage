package com.university.backend.integration;

import com.university.backend.dto.BeaconRequest;
import com.university.backend.dto.BeaconResponse;
import com.university.backend.exception.DuplicateResourceException;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.service.BeaconService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("postgres-test")
class BeaconPostgresIT {

    private static final UUID BEACON_UUID =
            UUID.fromString("e2c56db5-dffb-48d2-b060-d0f5a71096e0");

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private BeaconService beaconService;

    private int artifactId;

    @BeforeEach
    void setUp() {
        resetDatabase();
        artifactId = createArtifact();
    }

    @Test
    void schemaEnforcesIdentityRangeMappingAndInteractionIntegrity() {
        assertEquals(1, countConstraint("uk_beacon_identity", "u"));
        assertEquals(1, countConstraint("ck_beacon_major_range", "c"));
        assertEquals(1, countConstraint("ck_beacon_minor_range", "c"));
        assertEquals(1, countConstraint("fk_beacon_artifact", "f"));
        assertEquals(1, countConstraint("fk_visitor_interaction_beacon", "f"));

        Integer indexes = jdbcTemplate.queryForObject("""
                select count(*)
                from pg_indexes
                where schemaname = 'public'
                  and indexname in (
                      'uk_beacon_identity',
                      'idx_beacon_artifact_id',
                      'idx_visitor_interaction_beacon_id'
                  )
                """, Integer.class);
        assertEquals(3, indexes);

        Integer appliedV3 = jdbcTemplate.queryForObject("""
                select count(*)
                from flyway_schema_history
                where version = '3' and success = true
                """, Integer.class);
        assertEquals(1, appliedV3);

        Integer interactionBeaconColumn = jdbcTemplate.queryForObject("""
                select count(*)
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'visitor_interaction'
                  and column_name = 'beacon_id'
                """, Integer.class);
        assertEquals(1, interactionBeaconColumn);
    }

    @Test
    void resolveReturnsMappedEnabledBeaconAndOnlyEnabledIdentity() {
        int enabledId = createBeacon("Entrance", 1, 101, true, artifactId);
        int disabledId = createBeacon("Closed wing", 1, 102, false, artifactId);

        BeaconResponse enabled = beaconService.resolveBeacon(BEACON_UUID, 1, 101);
        assertEquals(enabledId, enabled.beaconId());
        assertEquals(artifactId, enabled.artifactId());
        assertEquals("Artifact", enabled.artifactName());

        assertThrows(ResourceNotFoundException.class,
                () -> beaconService.resolveBeacon(BEACON_UUID, 1, 102));
        assertThrows(ResourceNotFoundException.class,
                () -> beaconService.resolveBeacon(BEACON_UUID, 1, 999));

        assertEquals(2, jdbcTemplate.queryForObject(
                "select count(*) from beacon", Integer.class));
        assertTrue(disabledId > 0);
    }

    @Test
    void resolveReturnsUnmappedEnabledBeaconWithNullArtifact() {
        createBeacon("Unmapped", 2, 201, true, null);

        BeaconResponse response = beaconService.resolveBeacon(BEACON_UUID, 2, 201);

        assertNull(response.artifactId());
        assertNull(response.artifactName());
        assertNull(response.siteId());
        assertNull(response.siteName());
    }

    @Test
    void databaseRejectsDuplicateIdentityAndOutOfRangeValues() {
        createBeacon("Entrance", 1, 101, true, artifactId);

        assertThrows(DataIntegrityViolationException.class, () ->
                jdbcTemplate.update("""
                        insert into beacon (name, proximity_uuid, major, minor, enabled, artifact_id)
                        values ('Duplicate', ?::uuid, 1, 101, true, ?)
                        """, BEACON_UUID.toString(), artifactId));

        assertEquals(1, jdbcTemplate.queryForObject(
                "select count(*) from beacon", Integer.class));

        assertThrows(DataIntegrityViolationException.class, () ->
                jdbcTemplate.update("""
                        insert into beacon (name, proximity_uuid, major, minor, enabled, artifact_id)
                        values ('Invalid major', ?::uuid, 70000, 999, true, ?)
                        """, BEACON_UUID.toString(), artifactId));

        assertThrows(DataIntegrityViolationException.class, () ->
                jdbcTemplate.update("""
                        insert into beacon (name, proximity_uuid, major, minor, enabled, artifact_id)
                        values ('Invalid minor', ?::uuid, 2, -1, true, ?)
                        """, BEACON_UUID.toString(), artifactId));

        assertThrows(DataIntegrityViolationException.class, () ->
                jdbcTemplate.update("""
                        insert into beacon (name, proximity_uuid, major, minor, enabled, artifact_id)
                        values ('Unknown artifact', ?::uuid, 3, 301, true, ?)
                        """, BEACON_UUID.toString(), Integer.MAX_VALUE));
    }

    @Test
    void resolveLookupUsesIdentityIndex() {
        createBeacon("Entrance", 1, 101, true, artifactId);

        List<String> plan = jdbcTemplate.execute((ConnectionCallback<List<String>>) connection -> {
            try (Statement statement = connection.createStatement()) {
                statement.execute("set enable_seqscan = off");
                try (ResultSet resultSet = statement.executeQuery("""
                        explain
                        select beacon_id
                        from beacon
                        where proximity_uuid = 'e2c56db5-dffb-48d2-b060-d0f5a71096e0'
                          and major = 1
                          and minor = 101
                        """)) {
                    List<String> lines = new ArrayList<>();
                    while (resultSet.next()) {
                        lines.add(resultSet.getString(1));
                    }
                    return lines;
                } finally {
                    statement.execute("set enable_seqscan = on");
                }
            }
        });

        assertNotNull(plan);
        assertTrue(plan.stream().anyMatch(line -> line.contains("uk_beacon_identity")),
                () -> "Expected identity index usage, plan=" + plan);
    }

    @Test
    void concurrentResolveReturnsConsistentArtifact() throws Exception {
        int beaconId = createBeacon("Entrance", 1, 101, true, artifactId);
        int calls = 32;
        ExecutorService executor = Executors.newFixedThreadPool(calls);
        CountDownLatch ready = new CountDownLatch(calls);
        CountDownLatch start = new CountDownLatch(1);

        try {
            Callable<Integer> task = () -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Concurrent start timeout");
                }
                BeaconResponse response = beaconService.resolveBeacon(BEACON_UUID, 1, 101);
                assertEquals(beaconId, response.beaconId());
                return response.artifactId();
            };

            List<Future<Integer>> futures = new ArrayList<>();
            for (int i = 0; i < calls; i++) {
                futures.add(executor.submit(task));
            }

            assertTrue(ready.await(10, TimeUnit.SECONDS));
            long startedAt = System.nanoTime();
            start.countDown();

            for (Future<Integer> future : futures) {
                assertEquals(artifactId, future.get(30, TimeUnit.SECONDS));
            }

            long elapsedMs = Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
            assertTrue(elapsedMs < 10_000,
                    "Concurrent resolve took too long: " + elapsedMs + " ms");
            System.out.printf(
                    "S5 PostgreSQL beacon baseline: %d concurrent resolves=%d ms%n",
                    calls,
                    elapsedMs);
        } finally {
            start.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void concurrentDuplicateCreateAllowsExactlyOneBeacon() throws Exception {
        BeaconRequest request = request("Entrance", 1, 101, true, artifactId);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try {
            Callable<String> task = () -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Concurrent start timeout");
                }
                try {
                    beaconService.createBeacon(request);
                    return "created";
                } catch (DuplicateResourceException | DataIntegrityViolationException ex) {
                    return "rejected";
                }
            };

            Future<String> first = executor.submit(task);
            Future<String> second = executor.submit(task);

            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();

            List<String> results = List.of(
                    first.get(30, TimeUnit.SECONDS),
                    second.get(30, TimeUnit.SECONDS));

            assertEquals(1, results.stream().filter("created"::equals).count());
            assertEquals(1, results.stream().filter("rejected"::equals).count());
            assertEquals(1, jdbcTemplate.queryForObject(
                    "select count(*) from beacon", Integer.class));
        } finally {
            start.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void deletingBeaconKeepsInteractionAndClearsBeaconReference() {
        int beaconId = createBeacon("Entrance", 1, 101, true, artifactId);
        UUID eventId = UUID.randomUUID();
        Instant now = Instant.parse("2026-11-15T10:00:00Z");

        jdbcTemplate.update("""
                insert into visitor_interaction
                    (event_id, visitor_id, user_id, artifact_id, beacon_id,
                     interaction_type, language_code, started_at, ended_at,
                     duration_seconds, interacted_at)
                values (?::uuid, ?::uuid, null, ?, ?, 'BEACON_TRIGGER', 'vi', ?, ?, 30, ?)
                """,
                eventId.toString(),
                UUID.randomUUID().toString(),
                artifactId,
                beaconId,
                Timestamp.from(now),
                Timestamp.from(now.plusSeconds(30)),
                Timestamp.from(now));

        beaconService.deleteBeacon(beaconId);

        assertEquals(0, jdbcTemplate.queryForObject(
                "select count(*) from beacon", Integer.class));
        assertEquals(1, jdbcTemplate.queryForObject("""
                select count(*)
                from visitor_interaction
                where event_id = ?::uuid and beacon_id is null
                """, Integer.class, eventId.toString()));
    }

    private BeaconRequest request(
            String name,
            int major,
            int minor,
            boolean enabled,
            Integer targetArtifactId) {
        BeaconRequest request = new BeaconRequest();
        request.setName(name);
        request.setUuid(BEACON_UUID);
        request.setMajor(major);
        request.setMinor(minor);
        request.setEnabled(enabled);
        request.setArtifactId(targetArtifactId);
        return request;
    }

    private int createBeacon(
            String name,
            int major,
            int minor,
            boolean enabled,
            Integer targetArtifactId) {
        return jdbcTemplate.queryForObject("""
                insert into beacon (name, proximity_uuid, major, minor, enabled, artifact_id)
                values (?, ?::uuid, ?, ?, ?, ?)
                returning beacon_id
                """, Integer.class,
                name,
                BEACON_UUID.toString(),
                major,
                minor,
                enabled,
                targetArtifactId);
    }

    private int createArtifact() {
        int siteId = jdbcTemplate.queryForObject("""
                insert into heritage_site (name)
                values ('Beacon PostgreSQL IT site')
                returning site_id
                """, Integer.class);

        return jdbcTemplate.queryForObject("""
                insert into artifact (site_id, name)
                values (?, 'Artifact')
                returning artifact_id
                """, Integer.class, siteId);
    }

    private int countConstraint(String name, String type) {
        return jdbcTemplate.queryForObject("""
                select count(*)
                from pg_constraint
                where conname = ? and contype = ?
                """, Integer.class, name, type);
    }

    private void resetDatabase() {
        jdbcTemplate.update("delete from visitor_interaction");
        jdbcTemplate.update("delete from beacon");
        jdbcTemplate.update("delete from multimedia");
        jdbcTemplate.update("delete from artifact");
        jdbcTemplate.update("delete from heritage_site");
        jdbcTemplate.update("delete from \"user\"");
        jdbcTemplate.update("delete from role");
    }
}
