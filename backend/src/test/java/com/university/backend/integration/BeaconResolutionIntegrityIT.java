package com.university.backend.integration;

import com.university.backend.entity.Artifact;
import com.university.backend.entity.Beacon;
import com.university.backend.entity.HeritageSite;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.BeaconRepository;
import com.university.backend.repository.HeritageSiteRepository;
import com.university.backend.repository.VisitorInteractionRepository;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.university.backend.dto.BeaconRequest;
import com.university.backend.dto.BeaconResponse;
import com.university.backend.exception.DuplicateResourceException;
import com.university.backend.service.BeaconService;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("postgres-test")
@TestPropertySource(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
class BeaconResolutionIntegrityIT {

    private static final int MAJOR = 123;
    private static final int MINOR = 456;
    private Integer alternateArtifactId;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BeaconService beaconService;

    @Autowired
    private BeaconRepository beaconRepository;

    @Autowired
    private ArtifactRepository artifactRepository;

    @Autowired
    private HeritageSiteRepository heritageSiteRepository;

    @Autowired
    private VisitorInteractionRepository visitorInteractionRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private final List<Integer> createdBeaconIds = new ArrayList<>();
    private final List<UUID> createdInteractionEventIds = new ArrayList<>();

    private UUID beaconUuid;
    private Integer artifactId;
    private Integer siteId;

    @BeforeEach
    void setUp() {
        beaconUuid = UUID.randomUUID();

        HeritageSite site = new HeritageSite();
        site.setName("LTJ-57 Integration Site " + beaconUuid);
        site = heritageSiteRepository.saveAndFlush(site);
        siteId = site.getSiteId();

        Artifact artifact = new Artifact();
        artifact.setHeritageSite(site);
        artifact.setName("LTJ-57 Integration Artifact " + beaconUuid);
        artifact = artifactRepository.saveAndFlush(artifact);
        artifactId = artifact.getArtifactId();

        Artifact alternateArtifact = new Artifact();
        alternateArtifact.setHeritageSite(
                heritageSiteRepository.findById(siteId).orElseThrow());
        alternateArtifact.setName(
                "LTJ-57 Alternate Artifact " + beaconUuid);

        alternateArtifact = artifactRepository.saveAndFlush(alternateArtifact);
        alternateArtifactId = alternateArtifact.getArtifactId();
    }

    @AfterEach
    void cleanUp() {
        for (UUID eventId : createdInteractionEventIds) {
            jdbcTemplate.update(
                    "DELETE FROM visitor_interaction WHERE event_id = ?::uuid",
                    eventId.toString());
        }

        if (!createdBeaconIds.isEmpty()) {
            beaconRepository.deleteAllById(createdBeaconIds);
        }

        if (artifactId != null) {
            artifactRepository.deleteById(artifactId);
        }

        if (alternateArtifactId != null) {
            artifactRepository.deleteById(alternateArtifactId);
        }

        if (siteId != null) {
            heritageSiteRepository.deleteById(siteId);
        }
    }

    @Test
    void publicResolveReturnsMappedArtifactAndHeritageSite() throws Exception {
        Beacon beacon = createBeacon(beaconUuid, MAJOR, MINOR, true, true);

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", beaconUuid.toString())
                        .param("major", String.valueOf(MAJOR))
                        .param("minor", String.valueOf(MINOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.beaconId").value(beacon.getBeaconId()))
                .andExpect(jsonPath("$.data.uuid").value(beaconUuid.toString()))
                .andExpect(jsonPath("$.data.artifactId").value(artifactId))
                .andExpect(jsonPath("$.data.artifactName")
                        .value("LTJ-57 Integration Artifact " + beaconUuid))
                .andExpect(jsonPath("$.data.siteId").value(siteId))
                .andExpect(jsonPath("$.data.siteName")
                        .value("LTJ-57 Integration Site " + beaconUuid));
    }

    @Test
    void publicResolveAllowsEnabledBeaconWithoutArtifactMapping() throws Exception {
        createBeacon(beaconUuid, MAJOR, MINOR, true, false);

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", beaconUuid.toString())
                        .param("major", String.valueOf(MAJOR))
                        .param("minor", String.valueOf(MINOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.artifactId").doesNotExist());
    }

    @Test
    void publicResolveReturnsNotFoundForUnknownOrDisabledBeacon() throws Exception {
        createBeacon(beaconUuid, MAJOR, MINOR, false, true);

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", beaconUuid.toString())
                        .param("major", String.valueOf(MAJOR))
                        .param("minor", String.valueOf(MINOR)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", UUID.randomUUID().toString())
                        .param("major", String.valueOf(MAJOR))
                        .param("minor", String.valueOf(MINOR)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void concurrentCreationWithSameIdentityShouldCreateOnlyOneBeacon()
            throws Exception {

        int threadCount = 2;
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        try {
            List<Future<Boolean>> futures = new ArrayList<>();

            for (int i = 0; i < threadCount; i++) {
                futures.add(executor.submit(() -> {
                    ready.countDown();

                    if (!start.await(10, TimeUnit.SECONDS)) {
                        throw new IllegalStateException(
                                "Timed out waiting for concurrent start");
                    }

                    BeaconRequest request = new BeaconRequest();
                    request.setName("LTJ-57 Concurrent Beacon");
                    request.setUuid(beaconUuid);
                    request.setMajor(MAJOR);
                    request.setMinor(MINOR);
                    request.setEnabled(true);
                    request.setArtifactId(artifactId);

                    try {
                        BeaconResponse response =
                                beaconService.createBeacon(request);

                        return response.beaconId() != null;

                    } catch (DuplicateResourceException
                            | DataIntegrityViolationException exception) {
                        return false;
                    }
                }));
            }

            assertTrue(
                    ready.await(10, TimeUnit.SECONDS),
                    "Both threads should be ready before starting");

            start.countDown();

            int successCount = 0;
            int conflictCount = 0;

            for (Future<Boolean> future : futures) {
                if (future.get(30, TimeUnit.SECONDS)) {
                    successCount++;
                } else {
                    conflictCount++;
                }
            }

            List<Beacon> savedBeacons = beaconRepository
                    .findByProximityUuidAndMajorAndMinor(
                            beaconUuid, MAJOR, MINOR)
                    .stream()
                    .toList();

            assertEquals(1, successCount);
            assertEquals(1, conflictCount);
            assertEquals(1, savedBeacons.size());

            createdBeaconIds.add(savedBeacons.get(0).getBeaconId());

        } finally {
            start.countDown();
            executor.shutdownNow();
            assertTrue(
                    executor.awaitTermination(10, TimeUnit.SECONDS),
                    "Executor should terminate");
        }
    }

    @Test
    void concurrentMappingUpdatesAndResolutionShouldRemainConsistent()
            throws Exception {

        Beacon beacon = createBeacon(
                beaconUuid, MAJOR, MINOR, true, true);

        int updateIterations = 50;
        int resolveIterations = 100;

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        ExecutorService executor = Executors.newFixedThreadPool(2);

        String expectedSiteName = "LTJ-57 Integration Site " + beaconUuid;
        String firstArtifactName = "LTJ-57 Integration Artifact " + beaconUuid;
        String secondArtifactName = "LTJ-57 Alternate Artifact " + beaconUuid;

        try {
            Future<?> updateFuture = executor.submit(() -> {
                ready.countDown();

                if (!start.await(10, TimeUnit.SECONDS)) {
                    throw new IllegalStateException(
                            "Timed out waiting for concurrent start");
                }

                for (int i = 0; i < updateIterations; i++) {
                    Integer targetArtifactId = (i % 2 == 0)
                            ? alternateArtifactId
                            : artifactId;

                    BeaconRequest request = new BeaconRequest();
                    request.setName("LTJ-57 Test Beacon");
                    request.setUuid(beaconUuid);
                    request.setMajor(MAJOR);
                    request.setMinor(MINOR);
                    request.setEnabled(true);
                    request.setArtifactId(targetArtifactId);

                    beaconService.updateBeacon(beacon.getBeaconId(), request);
                }

                return null;
            });

            Future<?> resolveFuture = executor.submit(() -> {
                ready.countDown();

                if (!start.await(10, TimeUnit.SECONDS)) {
                    throw new IllegalStateException(
                            "Timed out waiting for concurrent start");
                }

                for (int i = 0; i < resolveIterations; i++) {
                    BeaconResponse response = beaconService.resolveBeacon(
                            beaconUuid, MAJOR, MINOR);

                    Integer resolvedArtifactId = response.artifactId();

                    assertTrue(
                            artifactId.equals(resolvedArtifactId)
                                    || alternateArtifactId.equals(resolvedArtifactId),
                            "Resolved Beacon must reference one of the two valid Artifacts");

                    String expectedArtifactName =
                            artifactId.equals(resolvedArtifactId)
                                    ? firstArtifactName
                                    : secondArtifactName;

                    assertEquals(expectedArtifactName, response.artifactName());
                    assertEquals(siteId, response.siteId());
                    assertEquals(expectedSiteName, response.siteName());
                }

                return null;
            });

            assertTrue(
                    ready.await(10, TimeUnit.SECONDS),
                    "Both threads should be ready before starting");

            start.countDown();

            updateFuture.get(60, TimeUnit.SECONDS);
            resolveFuture.get(60, TimeUnit.SECONDS);

        } finally {
            start.countDown();
            executor.shutdownNow();

            assertTrue(
                    executor.awaitTermination(10, TimeUnit.SECONDS),
                    "Executor should terminate");
        }
    }

    @Test
    void postgresRejectsDuplicateBeaconIdentity() {
        createBeacon(beaconUuid, MAJOR, MINOR, true, true);

        Beacon duplicate = new Beacon();
        duplicate.setName("LTJ-57 Duplicate Beacon");
        duplicate.setProximityUuid(beaconUuid);
        duplicate.setMajor(MAJOR);
        duplicate.setMinor(MINOR);
        duplicate.setEnabled(true);

        assertThrows(
                DataIntegrityViolationException.class,
                () -> beaconRepository.saveAndFlush(duplicate));
    }

    @Test
    void postgresRejectsOutOfRangeBeaconRowsAndUnknownArtifact() {
        UUID invalidUuid = UUID.randomUUID();

        assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update(
                        "INSERT INTO beacon "
                                + "(name, proximity_uuid, major, minor, enabled, artifact_id) "
                                + "VALUES ('Invalid major', ?::uuid, 65536, 1, true, ?)",
                        invalidUuid.toString(),
                        artifactId));

        assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update(
                        "INSERT INTO beacon "
                                + "(name, proximity_uuid, major, minor, enabled, artifact_id) "
                                + "VALUES ('Invalid minor', ?::uuid, 1, -1, true, ?)",
                        invalidUuid.toString(),
                        artifactId));

        assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update(
                        "INSERT INTO beacon "
                                + "(name, proximity_uuid, major, minor, enabled, artifact_id) "
                                + "VALUES ('Unknown artifact', ?::uuid, 2, 2, true, ?)",
                        invalidUuid.toString(),
                        Integer.MAX_VALUE - 1));
    }

    @Test
    void deletingBeaconKeepsInteractionAndClearsBeaconReference() {
        Beacon beacon = createBeacon(beaconUuid, MAJOR, MINOR, true, true);
        UUID eventId = UUID.randomUUID();
        createdInteractionEventIds.add(eventId);
        Instant now = Instant.parse("2026-11-15T10:00:00Z");

        jdbcTemplate.update(
                "INSERT INTO visitor_interaction "
                        + "(event_id, visitor_id, user_id, artifact_id, beacon_id, "
                        + "interaction_type, language_code, started_at, ended_at, "
                        + "duration_seconds, interacted_at) "
                        + "VALUES (?::uuid, ?::uuid, null, ?, ?, "
                        + "'BEACON_TRIGGER', 'vi', ?, ?, 30, ?)",
                eventId.toString(),
                UUID.randomUUID().toString(),
                artifactId,
                beacon.getBeaconId(),
                Timestamp.from(now),
                Timestamp.from(now.plusSeconds(30)),
                Timestamp.from(now));

        beaconService.deleteBeacon(beacon.getBeaconId());

        assertTrue(beaconRepository.findById(beacon.getBeaconId()).isEmpty());
        assertEquals(
                Integer.valueOf(1),
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM visitor_interaction "
                                + "WHERE event_id = ?::uuid AND beacon_id IS NULL",
                        Integer.class,
                        eventId.toString()));
    }

    @Test
    void publicResolveRejectsInvalidUuid() throws Exception {
        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", "invalid-uuid")
                        .param("major", String.valueOf(MAJOR))
                        .param("minor", String.valueOf(MINOR)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void publicResolveRejectsMissingRequiredParameters() throws Exception {
        mockMvc.perform(get("/api/beacons/resolve"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", beaconUuid.toString())
                        .param("minor", String.valueOf(MINOR)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", beaconUuid.toString())
                        .param("major", String.valueOf(MAJOR)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void publicResolveRejectsMajorAndMinorOutsideValidRange() throws Exception {
        int[] invalidValues = {-1, 65536, 70000};

        for (int value : invalidValues) {
            mockMvc.perform(get("/api/beacons/resolve")
                            .param("uuid", beaconUuid.toString())
                            .param("major", String.valueOf(value))
                            .param("minor", String.valueOf(MINOR)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            mockMvc.perform(get("/api/beacons/resolve")
                            .param("uuid", beaconUuid.toString())
                            .param("major", String.valueOf(MAJOR))
                            .param("minor", String.valueOf(value)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }
    }

    @Test
    void publicResolveRejectsNonIntegerAndEmptyMajorMinorValues()
            throws Exception {

        String[] invalidValues = {"not-a-number", "1.5", ""};

        for (String value : invalidValues) {
            mockMvc.perform(get("/api/beacons/resolve")
                            .param("uuid", beaconUuid.toString())
                            .param("major", value)
                            .param("minor", String.valueOf(MINOR)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            mockMvc.perform(get("/api/beacons/resolve")
                            .param("uuid", beaconUuid.toString())
                            .param("major", String.valueOf(MAJOR))
                            .param("minor", value))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }
    }

    @Test
    void publicResolveAcceptsBoundaryValuesAndSeparatesDifferentIdentities()
            throws Exception {

        int[][] identities = {{0, 0}, {0, 1}, {1, 0}, {65535, 65535}};

        for (int[] identity : identities) {
            createBeacon(beaconUuid, identity[0], identity[1], true, true);

            mockMvc.perform(get("/api/beacons/resolve")
                            .param("uuid", beaconUuid.toString())
                            .param("major", String.valueOf(identity[0]))
                            .param("minor", String.valueOf(identity[1])))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.artifactId").value(artifactId));
        }
    }

    @Test
    void publicResolveDoesNotRecordInteractionsForRejectedRequests()
            throws Exception {

        createBeacon(beaconUuid, MAJOR, MINOR, false, true);
        long interactionCount = visitorInteractionRepository.count();

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", beaconUuid.toString())
                        .param("major", "70000")
                        .param("minor", String.valueOf(MINOR)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", "invalid-uuid")
                        .param("major", String.valueOf(MAJOR))
                        .param("minor", String.valueOf(MINOR)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", UUID.randomUUID().toString())
                        .param("major", String.valueOf(MAJOR))
                        .param("minor", String.valueOf(MINOR)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", beaconUuid.toString())
                        .param("major", String.valueOf(MAJOR))
                        .param("minor", String.valueOf(MINOR)))
                .andExpect(status().isNotFound());

        assertEquals(interactionCount, visitorInteractionRepository.count());
    }

    @Test
    void postgresEnforcesBeaconIdentityAndProvidesResolutionIndex() {
        assertEquals(
                "uk_beacon_identity",
                jdbcTemplate.queryForObject(
                        "SELECT indexname FROM pg_indexes "
                                + "WHERE schemaname = 'public' "
                                + "AND tablename = 'beacon' "
                                + "AND indexname = 'uk_beacon_identity'",
                        String.class));

        assertEquals(
                "u",
                jdbcTemplate.queryForObject(
                        "SELECT contype::text FROM pg_constraint "
                                + "WHERE conname = 'uk_beacon_identity' "
                                + "AND conrelid = 'public.beacon'::regclass",
                        String.class));

        assertEquals(
                Integer.valueOf(2),
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM pg_constraint "
                                + "WHERE conrelid = 'public.beacon'::regclass "
                                + "AND contype = 'c' "
                                + "AND conname IN "
                                + "('ck_beacon_major_range', 'ck_beacon_minor_range')",
                        Integer.class));

        assertEquals(
                "fk_beacon_artifact",
                jdbcTemplate.queryForObject(
                        "SELECT conname FROM pg_constraint "
                                + "WHERE conrelid = 'public.beacon'::regclass "
                                + "AND contype = 'f' "
                                + "AND conname = 'fk_beacon_artifact'",
                        String.class));

        assertEquals(
                "idx_beacon_artifact_id",
                jdbcTemplate.queryForObject(
                        "SELECT indexname FROM pg_indexes "
                                + "WHERE schemaname = 'public' "
                                + "AND tablename = 'beacon' "
                                + "AND indexname = 'idx_beacon_artifact_id'",
                        String.class));

        assertEquals(
                "fk_visitor_interaction_beacon",
                jdbcTemplate.queryForObject(
                        "SELECT conname FROM pg_constraint "
                                + "WHERE conrelid = 'public.visitor_interaction'::regclass "
                                + "AND contype = 'f' "
                                + "AND conname = 'fk_visitor_interaction_beacon'",
                        String.class));

        assertEquals(
                "idx_visitor_interaction_beacon_id",
                jdbcTemplate.queryForObject(
                        "SELECT indexname FROM pg_indexes "
                                + "WHERE schemaname = 'public' "
                                + "AND tablename = 'visitor_interaction' "
                                + "AND indexname = 'idx_visitor_interaction_beacon_id'",
                        String.class));

        assertEquals(
                Integer.valueOf(1),
                jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM information_schema.columns "
                                + "WHERE table_schema = 'public' "
                                + "AND table_name = 'visitor_interaction' "
                                + "AND column_name = 'beacon_id'",
                        Integer.class));
    }

    @Test
    void resolveUsesOneSelectInsteadOfLazyThreeSelects() {
        Beacon beacon = createBeacon(
                beaconUuid, MAJOR, MINOR, true, true);

        Statistics statistics = entityManagerFactory
                .unwrap(SessionFactory.class)
                .getStatistics();

        TransactionTemplate transactionTemplate =
                new TransactionTemplate(transactionManager);

        statistics.clear();
        transactionTemplate.executeWithoutResult(status -> {
            Beacon legacy = beaconRepository
                    .findByProximityUuidAndMajorAndMinor(
                            beaconUuid, MAJOR, MINOR)
                    .orElseThrow();

            assertEquals(
                    "LTJ-57 Integration Artifact " + beaconUuid,
                    legacy.getArtifact().getName());
            assertEquals(
                    "LTJ-57 Integration Site " + beaconUuid,
                    legacy.getArtifact().getHeritageSite().getName());
        });
        long legacySelects = statistics.getPrepareStatementCount();

        statistics.clear();
        BeaconResponse response =
                beaconService.resolveBeacon(beaconUuid, MAJOR, MINOR);
        long optimizedSelects = statistics.getPrepareStatementCount();

        System.out.println(
                "Beacon resolve SQL selects: legacy=" + legacySelects
                        + ", optimized=" + optimizedSelects);

        assertEquals(3, legacySelects);
        assertEquals(1, optimizedSelects);
        assertEquals(beacon.getBeaconId(), response.beaconId());
        assertEquals(artifactId, response.artifactId());
        assertEquals(siteId, response.siteId());
    }

    @Test
    void representativeResolvePlanUsesBeaconIdentityIndex() {
        String fixtureName = "LTJ-57 Plan Fixture";
        UUID targetUuid = UUID.randomUUID();
        int targetMajor = 12345;
        int targetMinor = 54321;

        List<Object[]> fixtureRows = new ArrayList<>();
        fixtureRows.add(new Object[]{
                fixtureName, targetUuid, targetMajor, targetMinor});

        for (int i = 0; i < 4999; i++) {
            fixtureRows.add(new Object[]{
                    fixtureName,
                    UUID.randomUUID(),
                    i % 65536,
                    i / 65536});
        }

        try {
            jdbcTemplate.batchUpdate(
                    "INSERT INTO beacon "
                            + "(name, proximity_uuid, major, minor, enabled) "
                            + "VALUES (?, ?, ?, ?, true)",
                    fixtureRows);
            jdbcTemplate.execute("ANALYZE public.beacon");

            String plan = jdbcTemplate.queryForObject(
                    "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) "
                            + "SELECT b.beacon_id, b.name, b.proximity_uuid, "
                            + "b.major, b.minor, b.enabled, b.artifact_id, "
                            + "a.artifact_id, a.name, a.site_id, "
                            + "h.site_id, h.name "
                            + "FROM beacon b "
                            + "LEFT JOIN artifact a "
                            + "ON a.artifact_id = b.artifact_id "
                            + "LEFT JOIN heritage_site h "
                            + "ON h.site_id = a.site_id "
                            + "WHERE b.proximity_uuid = ? "
                            + "AND b.major = ? "
                            + "AND b.minor = ?",
                    String.class,
                    targetUuid,
                    targetMajor,
                    targetMinor);

            System.out.println(
                    "Beacon resolve representative plan: " + plan);

            assertTrue(
                    plan.toLowerCase().contains("uk_beacon_identity"),
                    "Representative plan should use the Beacon identity index");
        } finally {
            jdbcTemplate.update(
                    "DELETE FROM beacon WHERE name = ?", fixtureName);
        }
    }

    private Beacon createBeacon(
            UUID uuid,
            int major,
            int minor,
            boolean enabled,
            boolean withArtifact) {

        Beacon beacon = new Beacon();
        beacon.setName("LTJ-57 Test Beacon");
        beacon.setProximityUuid(uuid);
        beacon.setMajor(major);
        beacon.setMinor(minor);
        beacon.setEnabled(enabled);

        if (withArtifact) {
            beacon.setArtifact(
                    artifactRepository.findById(artifactId).orElseThrow());
        }

        Beacon saved = beaconRepository.saveAndFlush(beacon);
        createdBeaconIds.add(saved.getBeaconId());
        return saved;
    }
}
