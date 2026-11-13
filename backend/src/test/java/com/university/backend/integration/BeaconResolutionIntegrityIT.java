package com.university.backend.integration;

import com.university.backend.entity.Artifact;
import com.university.backend.entity.Beacon;
import com.university.backend.entity.HeritageSite;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.BeaconRepository;
import com.university.backend.repository.HeritageSiteRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.university.backend.dto.BeaconRequest;
import com.university.backend.dto.BeaconResponse;
import com.university.backend.exception.DuplicateResourceException;
import com.university.backend.service.BeaconService;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("postgres-test")
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

    private final List<Integer> createdBeaconIds = new ArrayList<>();

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
        int[] invalidValues = {-1, 65536};

        for (int value : invalidValues) {
            mockMvc.perform(get("/api/beacons/resolve")
                            .param("uuid", beaconUuid.toString())
                            .param("major", String.valueOf(value))
                            .param("minor", String.valueOf(MINOR)))
                    .andExpect(status().isBadRequest());

            mockMvc.perform(get("/api/beacons/resolve")
                            .param("uuid", beaconUuid.toString())
                            .param("major", String.valueOf(MAJOR))
                            .param("minor", String.valueOf(value)))
                    .andExpect(status().isBadRequest());
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
