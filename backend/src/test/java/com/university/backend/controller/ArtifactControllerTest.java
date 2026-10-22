package com.university.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.HeritageSiteRepository;
import com.university.backend.repository.MultimediaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ArtifactControllerTest extends ContentApiTestSupport {

    @Autowired
    private HeritageSiteRepository heritageSiteRepository;

    @Autowired
    private ArtifactRepository artifactRepository;

    @Autowired
    private MultimediaRepository multimediaRepository;

    @BeforeEach
    void cleanArtifactTestData() {
        multimediaRepository.deleteAll();
        artifactRepository.deleteAll();
        heritageSiteRepository.deleteAll();
    }

    private String validSiteRequest(String name) {
        return """
                {
                    "name": "%s",
                    "description": "Test heritage site",
                    "address": "Vietnam",
                    "latitude": 10.762622,
                    "longitude": 106.660172
                }
                """.formatted(name);
    }

    private String validArtifactRequest(int siteId, String name) {
        return """
                {
                    "siteId": %d,
                    "name": "%s",
                    "description": "Test artifact description"
                }
                """.formatted(siteId, name);
    }

    private int createSite(String token, String name) throws Exception {
        String response = mockMvc.perform(post("/api/heritage-sites")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validSiteRequest(name)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode data = objectMapper.readTree(response).path("data");
        return data.path("siteId").asInt();
    }

    private int createArtifact(String token, int siteId, String name) throws Exception {
        String response = mockMvc.perform(post("/api/artifacts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validArtifactRequest(siteId, name)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).path("data").path("artifactId").asInt();
    }

    @Test
    void getAllArtifactsShouldReturnOk() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Artifact Test Site");
        createArtifact(token, siteId, "Ancient Vase");

        mockMvc.perform(get("/api/artifacts")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("Ancient Vase"))
                .andExpect(jsonPath("$.data[0].siteId").value(siteId));
    }

    @Test
    void getArtifactsBySiteIdShouldReturnOnlyMatchingArtifacts() throws Exception {
        String token = createAdminToken();
        int firstSiteId = createSite(token, "First Site");
        int secondSiteId = createSite(token, "Second Site");

        createArtifact(token, firstSiteId, "First Site Artifact");
        createArtifact(token, secondSiteId, "Second Site Artifact");

        mockMvc.perform(get("/api/artifacts")
                        .param("siteId", String.valueOf(firstSiteId))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("First Site Artifact"))
                .andExpect(jsonPath("$.data[0].siteId").value(firstSiteId));
    }

    @Test
    void getArtifactsByUnknownSiteShouldReturnNotFound() throws Exception {
        String token = createAdminToken();

        mockMvc.perform(get("/api/artifacts")
                        .param("siteId", "999999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void getArtifactByIdShouldReturnArtifact() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Artifact Detail Site");
        int artifactId = createArtifact(token, siteId, "Bronze Drum");

        mockMvc.perform(get("/api/artifacts/{artifactId}", artifactId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.artifactId").value(artifactId))
                .andExpect(jsonPath("$.data.name").value("Bronze Drum"))
                .andExpect(jsonPath("$.data.siteId").value(siteId));
    }

    @Test
    void getUnknownArtifactShouldReturnNotFound() throws Exception {
        String token = createAdminToken();

        mockMvc.perform(get("/api/artifacts/{artifactId}", 999999)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminShouldUpdateArtifact() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Update Artifact Site");
        int artifactId = createArtifact(token, siteId, "Old Artifact Name");

        mockMvc.perform(put("/api/artifacts/{artifactId}", artifactId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validArtifactRequest(siteId, "Updated Artifact Name")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.artifactId").value(artifactId))
                .andExpect(jsonPath("$.data.name").value("Updated Artifact Name"))
                .andExpect(jsonPath("$.data.siteId").value(siteId));
    }

    @Test
    void adminShouldDeleteArtifact() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Delete Artifact Site");
        int artifactId = createArtifact(token, siteId, "Artifact To Delete");

        mockMvc.perform(delete("/api/artifacts/{artifactId}", artifactId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        org.junit.jupiter.api.Assertions.assertFalse(
                artifactRepository.existsById(artifactId));
    }

    @Test
    void createArtifactShouldRejectBlankName() throws Exception {
        String token = createAdminToken();
        int siteId = createSite(token, "Validation Site");

        mockMvc.perform(post("/api/artifacts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "siteId": %d,
                                    "name": " ",
                                    "description": "Invalid artifact"
                                }
                                """.formatted(siteId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createArtifactShouldRejectMissingSiteId() throws Exception {
        String token = createAdminToken();

        mockMvc.perform(post("/api/artifacts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "name": "Artifact Without Site",
                                    "description": "Invalid relationship"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createArtifactShouldRejectUnknownSiteId() throws Exception {
        String token = createAdminToken();

        mockMvc.perform(post("/api/artifacts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validArtifactRequest(999999, "Orphan Artifact")))
                .andExpect(status().isNotFound());
    }

    @Test
    void visitorShouldNotCreateArtifact() throws Exception {
        String adminToken = createAdminToken();
        int siteId = createSite(adminToken, "Permission Test Site");
        String visitorToken = createVisitorToken();

        mockMvc.perform(post("/api/artifacts")
                        .header("Authorization", "Bearer " + visitorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validArtifactRequest(siteId, "Visitor Artifact")))
                .andExpect(status().isForbidden());
    }

    @Test
    void visitorShouldNotUpdateArtifact() throws Exception {
        String adminToken = createAdminToken();
        int siteId = createSite(adminToken, "Protected Artifact Site");
        int artifactId = createArtifact(adminToken, siteId, "Protected Artifact");
        String visitorToken = createVisitorToken();

        mockMvc.perform(put("/api/artifacts/{artifactId}", artifactId)
                        .header("Authorization", "Bearer " + visitorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validArtifactRequest(siteId, "Changed Artifact")))
                .andExpect(status().isForbidden());
    }

    @Test
    void visitorShouldNotDeleteArtifact() throws Exception {
        String adminToken = createAdminToken();
        int siteId = createSite(adminToken, "Protected Delete Site");
        int artifactId = createArtifact(adminToken, siteId, "Protected Delete Artifact");
        String visitorToken = createVisitorToken();

        mockMvc.perform(delete("/api/artifacts/{artifactId}", artifactId)
                        .header("Authorization", "Bearer " + visitorToken))
                .andExpect(status().isForbidden());
    }
}
