package com.university.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.backend.entity.Artifact;
import com.university.backend.entity.HeritageSite;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.BeaconRepository;
import com.university.backend.repository.HeritageSiteRepository;
import com.university.backend.repository.VisitorInteractionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BeaconControllerTest {

    private static final UUID BEACON_UUID =
            UUID.fromString("e2c56db5-dffb-48d2-b060-d0f5a71096e0");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BeaconRepository beaconRepository;

    @Autowired
    private ArtifactRepository artifactRepository;

    @Autowired
    private HeritageSiteRepository heritageSiteRepository;

    @Autowired
    private VisitorInteractionRepository interactionRepository;

    private int artifactId;

//LTJ-68
@Test
@WithMockUser(roles = "ADMIN")
void adminUpdateRejectsDuplicateIdentityAndPreservesExistingBeacons() throws Exception {
    UUID secondUuid = UUID.fromString(
            "a2c56db5-dffb-48d2-b060-d0f5a71096e0");

    // Beacon thá»© nháº¥t Ä‘Ã£ tá»“n táº¡i vá»›i Ä‘á»‹nh danh BEACON_UUID / 1 / 101.
    int firstBeaconId = createBeaconViaRepository(true, artifactId);

    // Táº¡o Beacon thá»© hai vá»›i Ä‘á»‹nh danh khÃ¡c.
    mockMvc.perform(post("/api/admin/beacons")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(beaconBody(
                            "Second Beacon",
                            secondUuid,
                            2,
                            202,
                            true,
                            artifactId)))
            .andExpect(status().isCreated());

    int secondBeaconId = beaconRepository
            .findByProximityUuidAndMajorAndMinor(secondUuid, 2, 202)
            .orElseThrow()
            .getBeaconId();

    // Cá»‘ tÃ¬nh cáº­p nháº­t Beacon thá»© nháº¥t sang Ä‘á»‹nh danh cá»§a Beacon thá»© hai.
    mockMvc.perform(put("/api/admin/beacons/{beaconId}", firstBeaconId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(beaconBody(
                            "Attempted Duplicate",
                            secondUuid,
                            2,
                            202,
                            true,
                            artifactId)))
            .andExpect(status().isConflict());

    // Äá»‹nh danh cÅ© cá»§a Beacon thá»© nháº¥t váº«n hoáº¡t Ä‘á»™ng.
    mockMvc.perform(get("/api/beacons/resolve")
                    .param("uuid", BEACON_UUID.toString())
                    .param("major", "1")
                    .param("minor", "101"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.beaconId").value(firstBeaconId));

    // Äá»‹nh danh cá»§a Beacon thá»© hai váº«n thuá»™c vá» Beacon thá»© hai.
    mockMvc.perform(get("/api/beacons/resolve")
                    .param("uuid", secondUuid.toString())
                    .param("major", "2")
                    .param("minor", "202"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.beaconId").value(secondBeaconId));
}


    @BeforeEach
    void setUp() {
        interactionRepository.deleteAll();
        beaconRepository.deleteAll();
        artifactRepository.deleteAll();
        heritageSiteRepository.deleteAll();

        HeritageSite site = new HeritageSite();
        site.setName("Beacon Test Site");
        site = heritageSiteRepository.save(site);

        Artifact artifact = new Artifact();
        artifact.setHeritageSite(site);
        artifact.setName("Beacon Test Artifact");
        artifact = artifactRepository.save(artifact);
        artifactId = artifact.getArtifactId();
    }

    @AfterEach
    void tearDown() {
        interactionRepository.deleteAll();
        beaconRepository.deleteAll();
        artifactRepository.deleteAll();
        heritageSiteRepository.deleteAll();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanCreateListUpdateAndDeleteBeacon() throws Exception {
        String createBody = beaconBody("Entrance", BEACON_UUID, 1, 101, true, artifactId);

        String created = mockMvc.perform(post("/api/admin/beacons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Entrance"))
                .andExpect(jsonPath("$.data.artifactId").value(artifactId))
                .andReturn()
                .getResponse()
                .getContentAsString();
        int beaconId = objectMapper.readTree(created).path("data").path("beaconId").asInt();

        mockMvc.perform(get("/api/admin/beacons"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].beaconId").value(beaconId));

        mockMvc.perform(put("/api/admin/beacons/{beaconId}", beaconId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(beaconBody("Renamed", BEACON_UUID, 1, 101, false, null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Renamed"))
                .andExpect(jsonPath("$.data.enabled").value(false))
                .andExpect(jsonPath("$.data.artifactId").value(nullValue()));

        mockMvc.perform(delete("/api/admin/beacons/{beaconId}", beaconId))
                .andExpect(status().isOk());

        org.junit.jupiter.api.Assertions.assertEquals(0, beaconRepository.count());
    }


    @Test
    void publicResolveReturnsEnabledBeaconWithoutAuthentication() throws Exception {
        int beaconId = createBeaconViaRepository(true, artifactId);

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", BEACON_UUID.toString())
                        .param("major", "1")
                        .param("minor", "101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.beaconId").value(beaconId))
                .andExpect(jsonPath("$.data.artifactId").value(artifactId))
                .andExpect(jsonPath("$.data.artifactName").value("Beacon Test Artifact"));
    }

    //LTJ-68
        @Test
        void publicResolveReturnsEnabledBeaconWithoutArtifactMapping() throws Exception {
        int beaconId = createBeaconViaRepository(true, null);

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", BEACON_UUID.toString())
                        .param("major", "1")
                        .param("minor", "101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.beaconId").value(beaconId))
                .andExpect(jsonPath("$.data.enabled").value(true))
                .andExpect(jsonPath("$.data.artifactId").value(nullValue()))
                .andExpect(jsonPath("$.data.artifactName").value(nullValue()))
                .andExpect(jsonPath("$.data.siteId").value(nullValue()))
                .andExpect(jsonPath("$.data.siteName").value(nullValue()));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        void adminCanChangeBeaconArtifactMappingAndResolveUpdatedArtifact() throws Exception {
        HeritageSite secondSite = new HeritageSite();
        secondSite.setName("Second Beacon Test Site");
        secondSite = heritageSiteRepository.save(secondSite);

        Artifact secondArtifact = new Artifact();
        secondArtifact.setHeritageSite(secondSite);
        secondArtifact.setName("Second Beacon Test Artifact");
        secondArtifact = artifactRepository.save(secondArtifact);

        int beaconId = createBeaconViaRepository(true, artifactId);

        mockMvc.perform(put("/api/admin/beacons/{beaconId}", beaconId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(beaconBody(
                                "Entrance",
                                BEACON_UUID,
                                1,
                                101,
                                true,
                                secondArtifact.getArtifactId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.artifactId")
                        .value(secondArtifact.getArtifactId()));

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", BEACON_UUID.toString())
                        .param("major", "1")
                        .param("minor", "101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.beaconId").value(beaconId))
                .andExpect(jsonPath("$.data.artifactId")
                        .value(secondArtifact.getArtifactId()))
                .andExpect(jsonPath("$.data.artifactName")
                        .value("Second Beacon Test Artifact"))
                .andExpect(jsonPath("$.data.siteId").value(secondSite.getSiteId()))
                .andExpect(jsonPath("$.data.siteName").value("Second Beacon Test Site"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        void publicResolveStillWorksAfterAdminRemovesArtifactMapping() throws Exception {
        int beaconId = createBeaconViaRepository(true, artifactId);

        mockMvc.perform(put("/api/admin/beacons/{beaconId}", beaconId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(beaconBody(
                                "Entrance",
                                BEACON_UUID,
                                1,
                                101,
                                true,
                                null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.artifactId").value(nullValue()));

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", BEACON_UUID.toString())
                        .param("major", "1")
                        .param("minor", "101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.beaconId").value(beaconId))
                .andExpect(jsonPath("$.data.artifactId").value(nullValue()))
                .andExpect(jsonPath("$.data.artifactName").value(nullValue()))
                .andExpect(jsonPath("$.data.siteId").value(nullValue()))
                .andExpect(jsonPath("$.data.siteName").value(nullValue()));
        }


    @Test
    void publicResolveRejectsDisabledOrUnknownBeacon() throws Exception {
        createBeaconViaRepository(false, artifactId);

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", BEACON_UUID.toString())
                        .param("major", "1")
                        .param("minor", "101"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", BEACON_UUID.toString())
                        .param("major", "2")
                        .param("minor", "101"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCreateRejectsDuplicateIdentityAndInvalidRange() throws Exception {
        createBeaconViaRepository(true, artifactId);

        mockMvc.perform(post("/api/admin/beacons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(beaconBody("Duplicate", BEACON_UUID, 1, 101, true, artifactId)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));

        mockMvc.perform(post("/api/admin/beacons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(beaconBody("Invalid", BEACON_UUID, 70000, 101, true, artifactId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void adminEndpointsRequireAdminRole() throws Exception {
        mockMvc.perform(get("/api/admin/beacons"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "VISITOR")
    void visitorCannotManageBeacons() throws Exception {
        mockMvc.perform(get("/api/admin/beacons"))
                .andExpect(status().isForbidden());
    }

    private int createBeaconViaRepository(boolean enabled, Integer targetArtifactId) {
        com.university.backend.entity.Beacon beacon =
                new com.university.backend.entity.Beacon();
        beacon.setName("Entrance");
        beacon.setProximityUuid(BEACON_UUID);
        beacon.setMajor(1);
        beacon.setMinor(101);
        beacon.setEnabled(enabled);
        if (targetArtifactId != null) {
            beacon.setArtifact(artifactRepository.findById(targetArtifactId).orElseThrow());
        }
        return beaconRepository.save(beacon).getBeaconId();
    }

    private String beaconBody(
            String name,
            UUID uuid,
            int major,
            int minor,
            boolean enabled,
            Integer targetArtifactId) throws Exception {
        java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("name", name);
        body.put("uuid", uuid.toString());
        body.put("major", major);
        body.put("minor", minor);
        body.put("enabled", enabled);
        body.put("artifactId", targetArtifactId);
        return objectMapper.writeValueAsString(body);
    }
}
